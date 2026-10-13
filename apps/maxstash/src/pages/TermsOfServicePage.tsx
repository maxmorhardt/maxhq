import LegalPage, { type LegalSection } from '../components/common/LegalPage';
import PageMeta from '../components/common/PageMeta';

const sections: LegalSection[] = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing and using maxstash and its hosted applications, including squares.maxstash.io and any other application hosted on maxstash.io (collectively, "the Services"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Services.',
  },
  {
    title: '2. Description of Services',
    content:
      'The Services provide platforms for creating and participating in friendly competitions, such as squares contests for sports events and tournament brackets. The Services allow users to create contests, claim squares, join tournaments, and compete with others.',
  },
  {
    title: '3. User Accounts',
    content: [
      'To use certain features of the Services, you must sign in with a supported identity provider. You agree to:',
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
      'Use the Services for illegal gambling or wagering',
      'Harass, abuse, or harm other users',
      'Distribute spam, viruses, or malicious code',
      'Attempt to gain unauthorized access to the Services',
      'Interfere with or disrupt the Services or servers',
      'Use automated systems to access the Services',
    ],
  },
  {
    title: '5. Contests and Competitions',
    content:
      'The Services are intended for entertainment purposes only. Users are responsible for complying with all applicable laws regarding contests and games in their jurisdiction. We do not facilitate, endorse, or encourage illegal gambling activities.',
  },
  {
    title: '6. Intellectual Property',
    content:
      'The Services and their original content, features, and functionality are owned by maxstash and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Services without our permission.',
  },
  {
    title: '7. User Content',
    content:
      'You retain ownership of any content you submit to the Services. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with the Services. You represent that you have all necessary rights to grant this license.',
  },
  {
    title: '8. Disclaimers',
    content:
      'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. YOUR USE OF THE SERVICES IS AT YOUR OWN RISK.',
  },
  {
    title: '9. Limitation of Liability',
    content:
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR OTHER INTANGIBLE LOSSES.',
  },
  {
    title: '10. Indemnification',
    content:
      'You agree to indemnify and hold harmless maxstash and its affiliates from any claims, damages, losses, liabilities, and expenses arising from your use of the Services or violation of these Terms.',
  },
  {
    title: '11. Termination',
    content:
      'We reserve the right to suspend or terminate your account and access to the Services at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.',
  },
  {
    title: '12. Changes to Terms',
    content:
      'We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Services. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.',
  },
  {
    title: '13. Governing Law',
    content:
      'These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which maxstash operates, without regard to its conflict of law provisions.',
  },
  {
    title: '14. Contact Information',
    content:
      'If you have any questions about these Terms of Service, please contact us at: support@maxstash.io',
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <PageMeta
        title="Terms of Service – maxstash"
        description="Terms of service for maxstash and its hosted applications."
        canonical="https://maxstash.io/terms-of-service"
      />

      <LegalPage title="Terms of Service" lastUpdated="July 12, 2026" sections={sections} />
    </>
  );
}
