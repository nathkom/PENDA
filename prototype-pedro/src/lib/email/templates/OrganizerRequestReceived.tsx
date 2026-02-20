import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface OrganizerRequestReceivedProps {
  requesterName: string
  requesterEmail: string
  message: string | null
  reviewUrl: string
}

export function OrganizerRequestReceived({
  requesterName,
  requesterEmail,
  message,
  reviewUrl,
}: OrganizerRequestReceivedProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>New Organizer Request</Text>
          <Text style={paragraph}>
            A user has requested to become an organizer on Seattle Third Spaces.
          </Text>
          <Text style={label}>Name:</Text>
          <Text style={value}>{requesterName}</Text>
          <Text style={label}>Email:</Text>
          <Text style={value}>{requesterEmail}</Text>
          {message && (
            <>
              <Text style={label}>Message:</Text>
              <Container style={messageBox}>
                <Text style={messageText}>{message}</Text>
              </Container>
            </>
          )}
          <Button style={button} href={reviewUrl}>
            Review request
          </Button>
          <Hr style={hr} />
          <Text style={footer}>Seattle Third Spaces — Admin Notification</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default OrganizerRequestReceived

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
  marginBottom: "2px",
}

const value = {
  fontSize: "16px",
  color: "#4a4a4a",
  marginTop: "0",
  marginBottom: "12px",
}

const messageBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
}

const messageText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#334155",
  margin: "0",
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
