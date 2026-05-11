import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    faqItem: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    faqQuestion: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    faqAnswer: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  }), [colors]);

  return (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
  );
};

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const handleBack = () => {
    navigation.goBack();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    contactButton: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    contactButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
  }), [colors]);

  const faqs = [
    {
      question: 'How do I book a parking spot?',
      answer: 'Search for available spots in the Explore tab, select your preferred location, choose your date and time, and complete payment.',
    },
    {
      question: 'How do I list my parking spot?',
      answer: 'Go to Profile > List Your Spot. Fill in the details, add photos, and set your price. Your spot will be visible to drivers after approval.',
    },
    {
      question: 'Can I cancel my booking?',
      answer: 'Yes, you can cancel up to 30 minutes before your booking starts for a full refund. After that, the booking is non-refundable.',
    },
    {
      question: 'How does QR check-in work?',
      answer: 'Show the QR code in your app to the host or scan the spot\'s QR code to check in. The code is available in your booking details.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Help Center" onBack={handleBack} />
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:support@parkpal.app')}
          >
            <Text style={styles.contactButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};