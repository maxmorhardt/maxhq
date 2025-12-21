import LegalPageTemplate, { type LegalSection } from '../../components/common/LegalPageTemplate';

// terms of service page using legal page template
export default function TermsOfServicePage() {
  const sections: LegalSection[] = [
    {
      title: '1. Acceptance of Terms',
      content:
        'By accessing and using Squares ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.',
    },
    {
      title: '2. Description of Service',
      content:
        'Squares provides a platform for creating and managing squares contests for sports events and other activities. The Service allows users to create contests, claim squares, and participate in friendly competitions.',
    },
    {
      title: '3. User Accounts',
      content: [
        'To use certain features of the Service, you must register for an account. You agree to:',
        'Provide accurate and complete information',
        'Maintain the security of your account credentials',
        'Notify us immediately of any unauthorized use',
        'Accept responsibility for all activities under your account',
        'Be at least 13 years of age to create an account',
      ],
    },
    {
      title: '4. User Conduct',
      content: [
        'You agree not to:',
        'Violate any applicable laws or regulations',
        'Infringe on the rights of others',
        'Use the Service for illegal gambling or wagering',
        'Harass, abuse, or harm other users',
        'Distribute spam, viruses, or malicious code',
        'Attempt to gain unauthorized access to the Service',
        'Interfere with or disrupt the Service or servers',
        'Use automated systems to access the Service',
      ],
    },
    {
      title: '5. Contests and Squares',
      content:
        'The Service is intended for entertainment purposes only. Users are responsible for complying with all applicable laws regarding contests and games in their jurisdiction. We do not facilitate, endorse, or encourage illegal gambling activities.',
    },
    {
      title: '6. Intellectual Property',
      content:
        'The Service and its original content, features, and functionality are owned by Squares and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service without our permission.',
    },
    {
      title: '7. User Content',
      content:
        'You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with the Service. You represent that you have all necessary rights to grant this license.',
    },
    {
      title: '8. Disclaimers',
      content:
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.',
    },
    {
      title: '9. Limitation of Liability',
      content:
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR OTHER INTANGIBLE LOSSES.',
    },
    {
      title: '10. Indemnification',
      content:
        'You agree to indemnify and hold harmless Squares and its affiliates from any claims, damages, losses, liabilities, and expenses arising from your use of the Service or violation of these Terms.',
    },
    {
      title: '11. Termination',
      content:
        'We reserve the right to suspend or terminate your account and access to the Service at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.',
    },
    {
      title: '12. Changes to Terms',
      content:
        'We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Service. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.',
    },
    {
      title: '13. Governing Law',
      content:
        'These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Squares operates, without regard to its conflict of law provisions.',
    },
    {
      title: '14. Contact Information',
      content:
        'If you have any questions about these Terms of Service, please contact us at: support@maxstash.io',
    },
  ];

  return (
    <LegalPageTemplate
      title="Terms of Service"
      lastUpdated="December 18, 2025"
      sections={sections}
    />
  );
}
