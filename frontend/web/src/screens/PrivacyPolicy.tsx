import { Alert, Box, Container, Link, Typography } from '@mui/material';

export default function PrivacyPolicy() {
  return <Container maxWidth="md"><Box component="main" sx={{ py: { xs: 4, md: 8 } }}>
    <Typography variant="h3" component="h1" gutterBottom>Privacy Policy</Typography>
    <Alert severity="warning" sx={{ mb: 3 }}>Draft for review. Replace every bracketed placeholder and obtain legal review before publication.</Alert>
    <Typography color="text.secondary" paragraph>Last updated: [DATE]</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Who operates ParkPal</Typography>
    <Typography paragraph>ParkPal is operated by [LEGAL OPERATOR NAME], located at [POSTAL ADDRESS], [JURISDICTION]. Contact our privacy team at [PRIVACY CONTACT EMAIL].</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Information we handle</Typography>
    <Typography paragraph>Depending on the features you use, we may handle account details such as your name and email, optional phone number, parking search locations and dates, reservation and payment status, and messages you send to support. Payment details are handled by the payment provider shown during checkout; [CONFIRM PAYMENT DATA FLOW AND PROCESSOR].</Typography>
    <Typography variant="h5" component="h2" gutterBottom>How we use it</Typography>
    <Typography paragraph>We use account, search, booking and support information to provide and protect the service and meet legal obligations. If you allow optional analytics, the website sends anonymous performance measurements (such as page load time and layout stability) to help diagnose loading issues. These measurements are not linked to your account and are retained for up to 90 days. Optional analytics are disabled until you choose to allow them.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Storage, sharing and retention</Typography>
    <Typography paragraph>The website uses browser storage for sign-in and, if you make a choice, your optional analytics preference. [CONFIRM AUTH STORAGE TYPE, LIFETIME AND SECURITY CONTROLS.] We share information with service providers needed to operate the service, including hosting, maps and payment providers, as described at the time those features are used. We keep information for [RETENTION PERIODS] and delete or de-identify it when no longer needed, subject to legal requirements.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Your choices and rights</Typography>
    <Typography paragraph>You can reject or change optional analytics using <Link href="#privacy-choices" onClick={(event) => { event.preventDefault(); window.dispatchEvent(new Event('parkpal:privacy-choices')); }}>Privacy choices</Link>. Depending on your location, you may have rights to access, correct, delete, or restrict use of your information. Contact [PRIVACY CONTACT EMAIL] to make a request or raise a concern.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Children and changes</Typography>
    <Typography paragraph>ParkPal is not intended for children under [MINIMUM AGE]. We will update this policy when our practices change and show the revised date above.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Items requiring confirmation</Typography>
    <Typography component="ul"><li>Confirm operator, address, contact, jurisdiction and applicable privacy rights.</li><li>Document actual authentication, booking, payment, maps, analytics and support data flows.</li><li>Set retention periods and confirm provider contracts and international transfers.</li><li>Have counsel review this draft before launch.</li></Typography>
  </Box></Container>;
}
