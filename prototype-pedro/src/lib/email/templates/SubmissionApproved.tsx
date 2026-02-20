import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface SubmissionApprovedProps {
  itemTitle: string
  itemType: "place" | "event"
  itemUrl: string
}

export function SubmissionApproved({
  itemTitle,
  itemType,
  itemUrl,
}: SubmissionApprovedProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>Your {itemType} has been approved!</Text>
          <Text style={paragraph}>
            Great news! Your {itemType} <strong>&ldquo;{itemTitle}&rdquo;</strong> has
            been reviewed and published on Seattle Third Spaces.
          </Text>
          <Text style={paragraph}>
            It is now visible to everyone browsing the site.
          </Text>
          <Button style={button} href={itemUrl}>
            View your {itemType}
          </Button>
          <Hr style={hr} />
          <Text style={footer}>Seattle Third Spaces</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SubmissionApproved

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

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  marginTop: "24px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0 16px",
}

const footer = {
  fontSize: "12px",
  color: "#8898aa",
}
