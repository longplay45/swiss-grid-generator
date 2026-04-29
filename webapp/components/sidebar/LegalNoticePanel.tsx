import { X } from "lucide-react"
import type { ReactNode } from "react"

import { SectionHeaderRow } from "@/components/ui/section-header-row"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
}

type LegalSectionProps = {
  title: string
  children: ReactNode
  dividerClassName: string
}

function LegalSection({ title, children, dividerClassName }: LegalSectionProps) {
  return (
    <section className={`space-y-2 border-t pt-3 ${dividerClassName}`}>
      <SectionHeaderRow label={title} />
      {children}
    </section>
  )
}

export function LegalNoticePanel({ isDarkMode = false, onClose }: Props) {
  const tone = isDarkMode
    ? {
        body: "text-[#A8B1BF]",
        emphasis: "text-[#F4F6F8]",
        caption: "text-[#8D98AA]",
        divider: "border-[#313A47]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        link: "text-blue-400 hover:underline",
      }
    : {
        body: "text-gray-600",
        emphasis: "text-gray-900",
        caption: "text-gray-400",
        divider: "border-gray-200",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        link: "text-blue-600 hover:underline",
      }

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label="L E G A L"
          actionIcon={<X className="h-2 w-2" />}
          actionLabel="Close legal notice panel"
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>

      <section className="space-y-2">
        <SectionHeaderRow label="Legal Notice" />
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Information according to Section 5 DDG.
        </p>
      </section>

      <LegalSection title="Provider" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <span className={`font-medium ${tone.emphasis}`}>Ingo Wörner</span>
          <br />
          Naststr. 1
          <br />
          70376 Stuttgart
          <br />
          Germany
        </p>
      </LegalSection>

      <LegalSection title="Contact" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <a href="mailto:hello@swiss-grid-generator.com" className={tone.link}>
            hello@swiss-grid-generator.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Responsible for Own Content" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Ingo Wörner
          <br />
          Naststr. 1
          <br />
          70376 Stuttgart
          <br />
          Germany
        </p>
      </LegalSection>

      <LegalSection title="Privacy" dividerClassName={tone.divider}>
        <div className={`space-y-2 text-xs leading-relaxed ${tone.body}`}>
          <p>
            The controller for personal data processed by Swiss Grid Generator is Ingo Wörner, contactable at the email address above.
          </p>
          <p>
            The app processes account email addresses, authentication data, cloud project data, feedback messages, attached screenshots, optional support logs, and technical data required to operate the service.
          </p>
          <p>
            Processing is used to provide the editor, sign-in, cloud storage, feedback, support, security, and synchronization features. Legal bases are contract performance, legitimate interests, and consent where required.
          </p>
        </div>
      </LegalSection>

      <LegalSection title="Cloud Storage" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Signed-in users can store projects in Supabase. User projects and uploaded project content remain the responsibility of the respective user.
        </p>
      </LegalSection>

      <LegalSection title="Local Storage" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          The app uses local storage and IndexedDB for editor preferences, offline cache, recent local activity logs, and project synchronization. These are required for the requested editor and cloud-sync features. The app does not use advertising or analytics cookies.
        </p>
      </LegalSection>

      <LegalSection title="Feedback" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Feedback submissions are stored in Supabase and may include email, comment, screenshots, app version, and optional local support logs. They are used only to handle support, bug reports, and product feedback.
        </p>
      </LegalSection>

      <LegalSection title="User Rights" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Users may request access, correction, deletion, restriction, portability, or objection by email. Users may also lodge a complaint with a competent data protection supervisory authority.
        </p>
      </LegalSection>

      <LegalSection title="Terms of Use" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Swiss Grid Generator is provided as a professional design tool without a guarantee of uninterrupted availability. Users are responsible for their own documents, exports, backups, and lawful use of uploaded or stored content.
        </p>
      </LegalSection>

      <LegalSection title="Consumer Dispute Resolution" dividerClassName={tone.divider}>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
        </p>
      </LegalSection>

      <section className={`border-t pt-3 ${tone.divider}`}>
        <p className={`text-[11px] leading-relaxed ${tone.caption}`}>
          This compact legal notice is provided in English because the app interface is English only.
        </p>
      </section>
    </div>
  )
}
