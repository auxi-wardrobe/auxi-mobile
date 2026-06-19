import type { LegalDocument } from './types';

/**
 * Macgie Terms of Service — FINAL text, verbatim from Figma node 3177:6642
 * (frame "Terms of Service", 3177:6809). 18 sections, effective May 29 2026.
 *
 * English-only by design (see ./types.ts). When the legal copy changes, the
 * Figma node is the source of truth — update this file from it, do not edit
 * prose ad hoc.
 */
export const termsOfService: LegalDocument = {
  title: 'Macgie Terms of Service',
  effectiveDate: 'May 29, 2026',
  sections: [
    {
      paragraphs: [
        'Welcome to Macgie.',
        'These Terms of Service (“Terms”) govern your access to and use of the Macgie mobile application, website, AI styling services, wardrobe management tools, and related services (collectively, the “Service”).',
        'By accessing or using Macgie, you agree to these Terms.',
        'If you do not agree, please do not use the Service.',
      ],
    },
    {
      heading: '1. About Macgie',
      paragraphs: [
        'Macgie is a personal wardrobe and outfit recommendation platform designed to help users:',
      ],
      bullets: [
        'organize their wardrobe',
        'receive outfit recommendations',
        'explore personal style',
        'reduce decision fatigue',
        'track outfit usage and preferences',
        'better understand their fashion identity and daily dressing habits',
      ],
    },
    {
      paragraphs: [
        'Macgie may use artificial intelligence, machine learning, and personalization systems to generate styling suggestions and recommendations.',
        'Macgie is intended for personal, non-commercial use unless otherwise approved in writing.',
      ],
    },
    {
      heading: '2. Eligibility',
      paragraphs: [
        'You must be at least 13 years old to use Macgie.',
        'If you are under the age required by your local laws to consent to digital services, you must use Macgie with parental or guardian permission.',
        'By using the Service, you confirm that:',
      ],
      bullets: [
        'you are legally allowed to use the Service',
        'the information you provide is accurate',
        'you will comply with these Terms',
      ],
    },
    {
      heading: '3. Your Account',
      paragraphs: [
        'You may create an account using supported login providers such as Apple or Google.',
        'You are responsible for:',
      ],
      bullets: [
        'maintaining the security of your account',
        'keeping your login credentials confidential',
        'all activities occurring under your account',
      ],
    },
    {
      paragraphs: [
        'Macgie is not responsible for unauthorized access caused by your failure to secure your account.',
        'You agree not to:',
      ],
      bullets: [
        'impersonate another person',
        'create accounts for fraudulent purposes',
        'misuse or disrupt the Service',
      ],
    },
    {
      heading: '4. User Content',
      paragraphs: [
        'You retain ownership of the content you upload to Macgie, including:',
      ],
      bullets: [
        'clothing images',
        'outfit combinations',
        'wardrobe information',
        'profile details',
        'notes, tags, or preferences',
      ],
    },
    {
      paragraphs: [
        'By uploading content, you grant Macgie a limited, non-exclusive license to:',
      ],
      bullets: [
        'store',
        'process',
        'analyze',
        'display',
        'improve personalization and recommendation systems',
      ],
    },
    {
      paragraphs: [
        'solely for operating and improving the Service.',
        'You represent that:',
      ],
      bullets: [
        'you own or have permission to upload the content',
        'your content does not violate laws or third-party rights',
      ],
    },
    {
      paragraphs: [
        'You may delete your content at any time, subject to reasonable technical limitations and backup retention periods.',
      ],
    },
    {
      heading: '5. AI Recommendations & Styling Suggestions',
      paragraphs: [
        'Macgie provides AI-generated recommendations intended for inspiration and personal assistance.',
        'You understand that:',
      ],
      bullets: [
        'recommendations may not always be accurate',
        'styling suggestions are subjective',
        'outfit suitability may vary depending on personal taste, body type, weather, cultural context, or occasion',
      ],
    },
    {
      paragraphs: ['Macgie does not guarantee:'],
      bullets: [
        'fashion outcomes',
        'social outcomes',
        'emotional outcomes',
        'purchase decisions',
        'compatibility between all wardrobe items',
      ],
    },
    {
      paragraphs: [
        'The Service is designed to support decision-making, not replace personal judgment.',
      ],
    },
    {
      heading: '6. Wardrobe Data & Personalization',
      paragraphs: ['To improve recommendations, Macgie may analyze:'],
      bullets: [
        'wardrobe usage patterns',
        'outfit history',
        'item categories',
        'style preferences',
        'weather context',
        'interaction behavior within the app',
      ],
    },
    {
      paragraphs: [
        'This data helps personalize the user experience and improve recommendation quality.',
        'Macgie does not sell your personal wardrobe data to advertisers.',
        'For more information, please review our Privacy Policy.',
      ],
    },
    {
      heading: '7. Acceptable Use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'upload illegal, harmful, abusive, or infringing content',
        'attempt to reverse engineer or exploit the Service',
        'interfere with platform security',
        'use bots or automation to misuse the platform',
        'scrape or copy other users’ content without permission',
      ],
    },
    {
      paragraphs: [
        'We reserve the right to suspend or terminate accounts that violate these Terms.',
      ],
    },
    {
      heading: '8. Intellectual Property',
      paragraphs: [
        'Macgie and its related branding, interface designs, recommendation systems, visual assets, logos, and software are owned by Macgie or its licensors.',
        'You may not:',
      ],
      bullets: [
        'copy',
        'distribute',
        'reproduce',
        'modify',
        'commercially exploit',
      ],
    },
    {
      paragraphs: ['any part of the Service without written permission.'],
    },
    {
      heading: '9. Third-Party Services',
      paragraphs: [
        'Macgie may integrate with third-party services, including:',
      ],
      bullets: [
        'login providers',
        'weather services',
        'analytics providers',
        'AI infrastructure providers',
      ],
    },
    {
      paragraphs: [
        'We are not responsible for third-party services or their availability.',
        'Your use of those services may also be subject to their own terms and privacy policies.',
      ],
    },
    {
      heading: '10. Purchases & Subscriptions',
      paragraphs: [
        'Some features of Macgie may require payment or subscription.',
        'If applicable:',
      ],
      bullets: [
        'pricing will be shown before purchase',
        'subscriptions may automatically renew unless canceled',
        'refunds are subject to platform policies (Apple App Store / Google Play)',
      ],
    },
    {
      paragraphs: [
        'Macgie reserves the right to change pricing or features at any time.',
      ],
    },
    {
      heading: '11. Availability & Changes',
      paragraphs: ['We may:'],
      bullets: [
        'modify features',
        'add or remove functionality',
        'update recommendation systems',
        'temporarily suspend parts of the Service',
        'discontinue the Service',
      ],
    },
    {
      paragraphs: [
        'without prior notice.',
        'We are not liable for interruptions or feature changes.',
      ],
    },
    {
      heading: '12. Disclaimer',
      paragraphs: [
        'Macgie is provided “as is” and “as available.”',
        'To the fullest extent permitted by law, Macgie disclaims all warranties, including:',
      ],
      bullets: [
        'merchantability',
        'fitness for a particular purpose',
        'uninterrupted availability',
        'accuracy of recommendations',
      ],
    },
    {
      paragraphs: [
        'Fashion, identity, and personal style are subjective experiences.',
        'Macgie does not guarantee any specific result from using the Service.',
      ],
    },
    {
      heading: '13. Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by law, Macgie shall not be liable for:',
      ],
      bullets: [
        'indirect damages',
        'emotional distress',
        'loss of data',
        'wardrobe decisions',
        'purchasing decisions',
        'style-related dissatisfaction',
        'lost profits or business interruption',
      ],
    },
    {
      paragraphs: [
        'Our total liability shall not exceed the amount paid by you to Macgie in the previous 12 months, if any.',
      ],
    },
    {
      heading: '14. Termination',
      paragraphs: [
        'You may stop using Macgie at any time.',
        'We may suspend or terminate access if:',
      ],
      bullets: [
        'you violate these Terms',
        'misuse the platform',
        'create risk or harm to the Service or other users',
      ],
    },
    {
      paragraphs: [
        'Upon termination, your right to use the Service ends immediately.',
      ],
    },
    {
      heading: '15. Privacy',
      paragraphs: [
        'Your use of Macgie is also governed by our Privacy Policy.',
        'Please review it carefully to understand how we collect, use, and protect your data.',
      ],
    },
    {
      heading: '16. Changes to These Terms',
      paragraphs: [
        'We may update these Terms from time to time.',
        'If material changes are made, we may notify users through the app or other reasonable methods.',
        'Continued use of the Service after updates means you accept the revised Terms.',
      ],
    },
    {
      heading: '17. Contact',
      paragraphs: [
        'If you have questions about these Terms, please contact:',
        'marketing@macgie.com',
      ],
    },
    {
      heading: '18. Final Notes',
      paragraphs: [
        'Macgie is built to support self-expression, reduce daily friction, and help people feel more intentional about what they wear.',
        'Style is personal.\nRecommendations are suggestions.\nYou remain in control of your choices.',
        'Thank you for using Macgie.',
      ],
    },
  ],
};
