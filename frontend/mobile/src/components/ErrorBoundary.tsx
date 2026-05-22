import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ThemeContext.Consumer>
          {({ colors }) => {
            const styles = StyleSheet.create({
              container: {
                flex: 1,
                backgroundColor: colors.background,
              },
              content: {
                flexGrow: 1,
                justifyContent: 'center',
                padding: 20,
              },
              errorContainer: {
                alignItems: 'center',
              },
              errorTitle: {
                fontSize: 24,
                fontWeight: 'bold',
                color: colors.textPrimary,
                marginBottom: 10,
              },
              errorMessage: {
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: 'center',
                marginBottom: 20,
              },
              errorDetails: {
                width: '100%',
                marginBottom: 20,
              },
              errorDetailsTitle: {
                fontSize: 14,
                fontWeight: 'bold',
                color: colors.textPrimary,
                marginBottom: 5,
              },
              errorText: {
                fontSize: 12,
                color: colors.error,
                backgroundColor: colors.surface,
                padding: 10,
                borderRadius: 5,
                marginBottom: 5,
              },
              errorStack: {
                fontSize: 10,
                color: colors.textTertiary,
                backgroundColor: colors.surface,
                padding: 10,
                borderRadius: 5,
                fontFamily: 'monospace',
              },
              retryButton: {
                backgroundColor: colors.primary,
                paddingHorizontal: 30,
                paddingVertical: 15,
                borderRadius: 8,
              },
              retryButtonText: {
                color: colors.white,
                fontSize: 16,
                fontWeight: '600',
              },
            });

            return (
              <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.content}>
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Something went wrong</Text>
                    <Text style={styles.errorMessage}>
                      We're sorry, but something unexpected happened. Please try again.
                    </Text>

                    {__DEV__ && this.state.error && (
                      <View style={styles.errorDetails}>
                        <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
                        <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                        {this.state.errorInfo && (
                          <Text style={styles.errorStack}>{this.state.errorInfo.componentStack}</Text>
                        )}
                      </View>
                    )}

                    <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </SafeAreaView>
            );
          }}
        </ThemeContext.Consumer>
      );
    }

    return this.props.children;
  }
}
