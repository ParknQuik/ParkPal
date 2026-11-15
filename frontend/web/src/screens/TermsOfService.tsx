import { Alert, Box, Container, Typography } from '@mui/material';

export default function TermsOfService() {
  return <Container maxWidth="md"><Box component="main" sx={{ py: { xs: 4, md: 8 } }}>
    <Typography variant="h3" component="h1" gutterBottom>Terms of Service</Typography>
    <Alert severity="warning" sx={{ mb: 3 }}>Draft for review. Replace every bracketed placeholder and obtain legal review before publication.</Alert>
    <Typography color="text.secondary" paragraph>Last updated: [DATE]</Typography>
    <Typography paragraph>These draft terms describe use of ParkPal, operated by [LEGAL OPERATOR NAME] in [JURISDICTION]. Contact [LEGAL CONTACT EMAIL] with questions. Use of the service is subject to the final terms and applicable law.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>What ParkPal provides</Typography>
    <Typography paragraph>ParkPal helps drivers discover and request bookable parking spaces listed by owners. Listing details and availability are provided by the relevant listing owner and should be confirmed before travel. [DEFINE PARKPAL'S ROLE IN THE TRANSACTION AND ANY COMMERCIAL PARKING INFORMATION.]</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Accounts and bookings</Typography>
    <Typography paragraph>Provide accurate account information and keep your sign-in credentials secure. A reservation is subject to the details, price, availability and cancellation terms shown before you confirm it. Do not treat a booking as confirmed until ParkPal displays confirmation.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Payments, cancellations and disputes</Typography>
    <Typography paragraph>Payment methods and any fees will be shown during checkout. Payment processing is provided by [PAYMENT PROVIDER]. The applicable refund, cancellation, no-show, host payout, chargeback and dispute rules must be stated here before bookings are offered: [ADD APPROVED PAYMENT AND CANCELLATION TERMS].</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Acceptable use and listings</Typography>
    <Typography paragraph>Do not misuse the service, interfere with its operation, submit deceptive information, or list a space you are not authorized to offer. [ADD HOST ELIGIBILITY, LISTING STANDARDS, CONTENT RIGHTS AND ENFORCEMENT PROCESS.]</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Availability and liability</Typography>
    <Typography paragraph>The service may change or be unavailable from time to time. Any warranty limits, liability limits and consumer-law rights must be tailored to [JURISDICTION] and reviewed by counsel; no draft language here limits rights that cannot legally be limited.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Changes and legal review</Typography>
    <Typography paragraph>We will post updated terms with a revised date. These terms need legal review and operator approval before they are presented as binding.</Typography>
    <Typography variant="h5" component="h2" gutterBottom>Items requiring confirmation</Typography>
    <Typography component="ul"><li>Confirm legal operator, jurisdiction, governing law and dispute forum.</li><li>Approve booking, refund, cancellation, host, fees and payment terms.</li><li>Set rules for listing accuracy, safety, prohibited conduct and account suspension.</li><li>Have counsel review consumer, privacy, accessibility and liability language.</li></Typography>
  </Box></Container>;
}
