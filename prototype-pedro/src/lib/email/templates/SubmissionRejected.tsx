import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
} from "@react-email/components"

interface SubmissionRejectedProps {
  itemTitle: string
  itemType: "place" | "event"
  rejectionNote: string
}

export function SubmissionRejected({
  itemTitle,
  itemType,
  rejectionNote,
}: SubmissionRejectedProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>
            Your {itemType} submission needs changes
          </Text>
          <Text style={paragraph}>
            Your {itemType} <strong>&ldquo;{itemTitle}&rdquo;</strong> was reviewed
            but could not be published at this time.
          </Text>
          <Text style={label}>Reviewer note:</Text>
          <Container style={noteBox}>
            <Text style={noteText}>{rejectionNote}</Text>
          </Container>
          <Text style={paragraph}>
            You can revise your submission and resubmit it for review from your
            organizer dashboard.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Seattle Third Spaces</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SubmissionRejected

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
}

const heading = {
  fontSize: "24px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  marginBottom: "16px",
}

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#4a4a4a",
}

const label = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#1a1a1a",
  marginBottom: "4px",
}

const noteBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
}

const noteText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#92400e",
  margin: "0",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0 16px",
}

const footer = {
  fontSize: "12px",
  color: "#8898aa",
}
