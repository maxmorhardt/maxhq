import LegalPageTemplate, { type LegalSection } from '../../components/common/LegalPageTemplate';

// privacy policy page using legal page template
export default function PrivacyPolicyPage() {
  const sections: LegalSection[] = [
    {
      title: '1. Introduction',
      content:
        'Welcome to Squares ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.',
    },
    {
      title: '2. Information We Collect',
      content: [
        'We collect information that you provide directly to us when using our service:',
        'Account information (name, email address, authentication details)',
        'Contest information (squares you claim, contest names you create)',
        'Usage data (how you interact with our application)',
        'Device information (browser type, IP address, device identifiers)',
      ],
    },
    {
      title: '3. How We Use Your Information',
      content: [
        'We use the information we collect to:',
        'Provide, operate, and maintain our service',
        'Improve and personalize your experience',
        'Communicate with you about updates and features',
        'Process your transactions and manage your contests',
        'Detect and prevent fraud or abuse',
        'Comply with legal obligations',
      ],
    },
    {
      title: '4. Information Sharing',
      content: [
        'We do not sell your personal information. We may share your information with:',
        'Other users (when you participate in public contests)',
        'Service providers who assist in operating our platform',
        'Legal authorities when required by law',
        'Business partners with your consent',
      ],
    },
    {
      title: '5. Data Security',
      content:
        'We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.',
    },
    {
      title: '6. Your Privacy Rights',
      content: [
        'You have the right to:',
        'Access and receive a copy of your personal information',
        'Request correction of inaccurate data',
        'Request deletion of your personal information',
        'Object to or restrict processing of your data',
        'Withdraw consent at any time',
      ],
    },
    {
      title: '7. Cookies and Tracking',
      content:
        'We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.',
    },
    {
      title: "8. Children's Privacy",
      content:
        'Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.',
    },
    {
      title: '9. Changes to This Policy',
      content:
        'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
    },
    {
      title: '10. Contact Us',
      content:
        'If you have any questions about this Privacy Policy, please contact us at: support@maxstash.io',
    },
  ];

  return (
    <LegalPageTemplate title="Privacy Policy" lastUpdated="December 18, 2025" sections={sections} />
  );
}
