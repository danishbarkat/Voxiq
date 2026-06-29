import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'June 1, 2025';
const COMPANY = 'Voxiq';
const CONTACT_EMAIL = 'legal@voxiq.com';

export default function TermsAndConditions() {
  return (
    <div style={{ minHeight: '100vh', background: '#020D1A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link to="/signup" style={{ color: '#7C6DFA', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            ← Back to Signup
          </Link>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F1F5F9', margin: '0 0 8px' }}>Terms and Conditions</h1>
          <p style={{ color: '#6B9AB8', fontSize: 14, margin: 0 }}>Effective Date: {EFFECTIVE_DATE} &nbsp;|&nbsp; {COMPANY} Automated Dialing Platform</p>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 32, fontSize: 14, color: '#F59E0B' }}>
          <strong>Important Notice:</strong> By registering on {COMPANY}, you confirm that your organization will use this platform in full compliance with Pakistani law, international telecommunications regulations, and the terms set out below. Violation of these terms may result in immediate account suspension, legal action, and reporting to relevant regulatory authorities.
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By completing the registration process and checking the "I Agree" checkbox, you ("Company Admin" or "User") and the organization you represent ("Company") agree to be bound by these Terms and Conditions ("Terms"). These Terms form a legally binding agreement between your Company and {COMPANY} ("Platform", "we", "us", "our").</p>
          <p>If you do not agree to these Terms, you must not register or use the Platform.</p>
        </Section>

        <Section title="2. Platform Description">
          <p>{COMPANY} is an automated telephony and dialing platform that provides outbound/inbound calling, SMS messaging, call recording, agent management, and related services. The Platform operates through licensed telecommunications infrastructure and is intended solely for lawful business communication purposes.</p>
        </Section>

        <Section title="3. Eligibility and Registration">
          <ul>
            <li>You must be at least 18 years of age and legally authorized to bind your organization.</li>
            <li>You must provide accurate and complete company information, including your Company Name and National Tax Number (NTN) if applicable.</li>
            <li>You must use a valid corporate/business email address. Free email services (Gmail, Yahoo, etc.) are not permitted.</li>
            <li>Your company must be a legally registered entity in Pakistan or the jurisdiction where it operates.</li>
            <li>Providing false information during registration is grounds for immediate termination and may constitute fraud under applicable law.</li>
          </ul>
        </Section>

        <Section title="4. Lawful Use — Pakistan Specific Regulations">
          <p>By using {COMPANY}, you represent and warrant that all use of the Platform will comply with the following laws and regulations:</p>

          <SubSection title="4.1 Pakistan Telecommunication Authority (PTA)">
            <ul>
              <li>The Platform may only be used for lawful telecommunications purposes as defined under the <strong>Pakistan Telecommunication (Re-organization) Act, 1996</strong>.</li>
              <li>You must not use the Platform to make calls or send SMS in a manner that violates PTA licensing conditions or directions issued by the Authority.</li>
              <li>Unsolicited commercial communications (spam calls/SMS) are prohibited without prior consent of the recipient as required under PTA's Consumer Protection Regulations.</li>
              <li>You must comply with all PTA directives regarding the use of automated dialers and bulk messaging services.</li>
            </ul>
          </SubSection>

          <SubSection title="4.2 Prevention of Electronic Crimes Act (PECA) 2016">
            <ul>
              <li>You must not use the Platform to commit any offence under <strong>PECA 2016</strong>, including but not limited to: unauthorized interception of communications (Section 8), cyberstalking or harassment via calls/SMS (Section 24), dissemination of false information (Section 26), or any other cyber crime.</li>
              <li>Call recordings and data collected through the Platform must not be used for blackmail, extortion, defamation, or any other illegal purpose.</li>
              <li>Violations of PECA 2016 through the Platform will be reported to the Federal Investigation Agency (FIA) Cybercrime Wing.</li>
            </ul>
          </SubSection>

          <SubSection title="4.3 Do Not Call / Consent Requirements">
            <ul>
              <li>You are solely responsible for obtaining prior express consent from individuals before contacting them via automated dialing or SMS.</li>
              <li>You must maintain and honor Do Not Call (DNC) lists. Calling numbers on your internal DNC list is prohibited.</li>
              <li>Calling individuals who have requested to be removed from your contact list is a violation of these Terms and applicable law.</li>
            </ul>
          </SubSection>

          <SubSection title="4.4 Call Recording Laws">
            <ul>
              <li>Where required by applicable law, you must inform all parties that a call is being recorded before recording commences.</li>
              <li>Call recordings must not be shared with unauthorized third parties.</li>
              <li>Recordings may not be used as evidence in legal proceedings without proper legal authorization.</li>
              <li>You must comply with any data retention and deletion requirements under applicable Pakistani law.</li>
            </ul>
          </SubSection>
        </Section>

        <Section title="5. Prohibited Uses">
          <p>The following activities are strictly prohibited on the Platform:</p>
          <ul>
            <li><strong>Harassment and Threats:</strong> Using the Platform to harass, threaten, intimidate, or harm any individual.</li>
            <li><strong>Fraud and Scams:</strong> Using the Platform for phishing, vishing (voice phishing), smishing (SMS phishing), or any fraudulent scheme.</li>
            <li><strong>Impersonation:</strong> Impersonating government agencies (FBR, NADRA, FIA, PTA, banks, police) or any other organization.</li>
            <li><strong>Spam:</strong> Sending bulk unsolicited calls or SMS messages without recipient consent.</li>
            <li><strong>Money Laundering:</strong> Using the Platform in connection with any money laundering, terrorist financing, or other financial crimes under the <strong>Anti-Money Laundering Act, 2010</strong>.</li>
            <li><strong>Illegal Gambling:</strong> Promoting or facilitating illegal gambling activities.</li>
            <li><strong>Adult/Obscene Content:</strong> Transmitting obscene, indecent, or pornographic content in violation of the <strong>Prevention of Electronic Crimes Act, 2016</strong> and <strong>Pakistan Penal Code</strong>.</li>
            <li><strong>Political Misuse:</strong> Using the Platform for unauthorized political campaigning or voter suppression in violation of election laws.</li>
            <li><strong>Circumventing Regulations:</strong> Using the Platform to circumvent PTA or other regulatory requirements applicable to telecommunications.</li>
            <li><strong>Reselling Without Authorization:</strong> Reselling, sublicensing, or white-labeling the Platform without prior written consent from {COMPANY}.</li>
          </ul>
        </Section>

        <Section title="6. Data Protection and Privacy">
          <ul>
            <li>You are responsible for ensuring that all personal data of individuals collected through the Platform is handled in accordance with applicable privacy laws.</li>
            <li>You must not store sensitive personal information (CNIC numbers, financial data, passwords) in call notes, lead records, or any Platform fields unless required for your lawful business purpose.</li>
            <li>You must implement adequate security measures to protect personal data accessed through the Platform.</li>
            <li>{COMPANY} does not sell your data to third parties. Our privacy practices are described in our Privacy Policy.</li>
          </ul>
        </Section>

        <Section title="7. Company Responsibility and Agent Conduct">
          <ul>
            <li>The registered Company Admin is solely responsible for all activities conducted through the Company's account, including the actions of all agents added under the account.</li>
            <li>You must ensure that all agents are trained on lawful calling practices and these Terms before granting them access to the Platform.</li>
            <li>You must not share login credentials between users. Each agent must have their own individual account.</li>
            <li>{COMPANY} reserves the right to suspend any account where agent misconduct is reported or detected.</li>
          </ul>
        </Section>

        <Section title="8. Acceptable Use of Phone Numbers">
          <ul>
            <li>Phone numbers assigned to your account through the Platform must only be used for the lawful business purposes stated during registration.</li>
            <li>Numbers must not be used for spoofing, caller ID manipulation, or any deceptive practice prohibited under PTA regulations.</li>
            <li>Numbers remain the property of the underlying telecommunications carrier and are subject to their terms of service.</li>
            <li>{COMPANY} reserves the right to reclaim numbers that are used in violation of these Terms or carrier regulations.</li>
          </ul>
        </Section>

        <Section title="9. Monitoring and Enforcement">
          <ul>
            <li>{COMPANY} reserves the right to monitor usage of the Platform for compliance with these Terms, applicable law, and carrier requirements.</li>
            <li>We may suspend or terminate accounts without prior notice if we detect illegal activity, fraud, abuse, or violations of these Terms.</li>
            <li>We will cooperate with law enforcement agencies, including FIA, PTA, and other government authorities, in response to lawful requests for information.</li>
            <li>We reserve the right to report violations to the relevant Pakistani authorities, including PTA Cybercrime Wing and FIA.</li>
          </ul>
        </Section>

        <Section title="10. Limitation of Liability">
          <ul>
            <li>{COMPANY} provides the Platform on an "as is" basis and makes no warranties regarding uninterrupted or error-free service.</li>
            <li>We are not liable for any unlawful use of the Platform by registered Companies or their agents.</li>
            <li>In no event shall {COMPANY}'s total liability exceed the amount paid by your Company in the three (3) months preceding the claim.</li>
            <li>We are not responsible for any fines, penalties, or legal consequences resulting from your violation of applicable telecommunications laws.</li>
          </ul>
        </Section>

        <Section title="11. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless {COMPANY}, its officers, directors, employees, and partners from any claims, damages, losses, penalties, or legal costs arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your violation of any applicable law or regulation; or (d) the conduct of your agents using the Platform.</p>
        </Section>

        <Section title="12. Termination">
          <ul>
            <li>{COMPANY} may suspend or terminate your account at any time for violation of these Terms, illegal activity, or non-payment.</li>
            <li>Upon termination, your access to the Platform and all associated data will be revoked. Data may be retained as required by law.</li>
            <li>You may request account closure at any time by contacting {CONTACT_EMAIL}.</li>
          </ul>
        </Section>

        <Section title="13. Governing Law and Dispute Resolution">
          <ul>
            <li>These Terms shall be governed by and construed in accordance with the laws of the <strong>Islamic Republic of Pakistan</strong>.</li>
            <li>Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of <strong>Islamabad, Pakistan</strong>.</li>
            <li>Before initiating legal proceedings, both parties agree to attempt resolution through good-faith negotiation for a period of thirty (30) days.</li>
          </ul>
        </Section>

        <Section title="14. Amendments">
          <p>{COMPANY} reserves the right to update these Terms at any time. Material changes will be communicated via email to the registered Company Admin. Continued use of the Platform after the effective date of updated Terms constitutes acceptance of the new Terms.</p>
        </Section>

        <Section title="15. Contact Information">
          <p>For questions, legal notices, or compliance concerns, contact us at:</p>
          <p style={{ fontWeight: 600 }}>{COMPANY} Legal &amp; Compliance<br />Email: {CONTACT_EMAIL}</p>
        </Section>

        <div style={{ borderTop: '1px solid #1e2537', paddingTop: 24, marginTop: 16, color: '#6B9AB8', fontSize: 13 }}>
          By registering on {COMPANY}, you confirm that you have read, understood, and agree to these Terms and Conditions in full.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid #1e2537' }}>{title}</h2>
      <div style={{ color: '#CBD5E1', fontSize: 14.5, lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>{title}</h3>
      <div style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
