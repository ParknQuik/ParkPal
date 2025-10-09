const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class SecretManager {
  constructor() {
    this.client = null;
    this.projectId = process.env.GCP_PROJECT_ID;
    this.isEnabled = process.env.USE_SECRET_MANAGER === 'true';
  }

  /**
   * Initialize the Secret Manager client
   */
  initialize() {
    if (!this.isEnabled) {
      console.log('Secret Manager is disabled. Using local environment variables.');
      return;
    }

    if (!this.projectId) {
      console.warn('GCP_PROJECT_ID not set. Secret Manager will not be available.');
      return;
    }

    try {
      // The GOOGLE_APPLICATION_CREDENTIALS environment variable is automatically
      // detected by the Google Cloud client libraries. No need to pass it explicitly.
      // Just ensure it's set in your .env file and the client will use it.
      this.client = new SecretManagerServiceClient();
      console.log('Secret Manager client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Secret Manager client:', error.message);
      throw error;
    }
  }

  /**
   * Get a secret value from GCP Secret Manager
   * @param {string} secretName - The name of the secret
   * @param {string} version - The version of the secret (default: 'latest')
   * @returns {Promise<string>} - The secret value
   */
  async getSecret(secretName, version = 'latest') {
    if (!this.isEnabled) {
      // Fallback to environment variable if Secret Manager is disabled
      const envKey = secretName.toUpperCase().replace(/-/g, '_');
      return process.env[envKey] || '';
    }

    if (!this.client) {
      throw new Error('Secret Manager client not initialized');
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;

      const [version_response] = await this.client.accessSecretVersion({ name });
      const payload = version_response.payload.data.toString('utf8');

      console.log(`Successfully retrieved secret: ${secretName}`);
      return payload;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error.message);

      // Fallback to environment variable if secret not found in GCP
      const envKey = secretName.toUpperCase().replace(/-/g, '_');
      const fallbackValue = process.env[envKey];

      if (fallbackValue) {
        console.log(`Using fallback environment variable for ${secretName}`);
        return fallbackValue;
      }

      throw error;
    }
  }

  /**
   * Get multiple secrets at once
   * @param {string[]} secretNames - Array of secret names
   * @returns {Promise<Object>} - Object with secret names as keys and values
   */
  async getSecrets(secretNames) {
    const secrets = {};

    await Promise.all(
      secretNames.map(async (name) => {
        try {
          secrets[name] = await this.getSecret(name);
        } catch (error) {
          console.error(`Failed to get secret ${name}:`, error.message);
          secrets[name] = null;
        }
      })
    );

    return secrets;
  }

  /**
   * Create or update a secret in GCP Secret Manager
   * @param {string} secretName - The name of the secret
   * @param {string} secretValue - The value to store
   * @returns {Promise<void>}
   */
  async createOrUpdateSecret(secretName, secretValue) {
    if (!this.isEnabled) {
      throw new Error('Secret Manager is disabled. Cannot create secrets.');
    }

    if (!this.client) {
      throw new Error('Secret Manager client not initialized');
    }

    try {
      const parent = `projects/${this.projectId}`;

      // Try to create the secret first
      try {
        await this.client.createSecret({
          parent,
          secretId: secretName,
          secret: {
            replication: {
              automatic: {},
            },
          },
        });
        console.log(`Created secret: ${secretName}`);
      } catch (createError) {
        if (createError.code !== 6) { // 6 = ALREADY_EXISTS
          throw createError;
        }
        console.log(`Secret ${secretName} already exists, adding new version`);
      }

      // Add a new version with the secret value
      const secretPath = `projects/${this.projectId}/secrets/${secretName}`;
      await this.client.addSecretVersion({
        parent: secretPath,
        payload: {
          data: Buffer.from(secretValue, 'utf8'),
        },
      });

      console.log(`Successfully added version to secret: ${secretName}`);
    } catch (error) {
      console.error(`Failed to create/update secret ${secretName}:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
const secretManager = new SecretManager();

module.exports = secretManager;
