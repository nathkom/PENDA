import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from "@react-email/components"

interface OrganizerRequestDecisionProps {
  approved: boolean
  requesterName: string
}

export function OrganizerRequestDecision({
  approved,
  requesterName,
}: OrganizerRequestDecisionProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>
            {approved
              ? "Welcome aboard, Organizer!"
              : "Organizer Request Update"}
          </Text>
          <Text style={paragraph}>Hi {requesterName},</Text>
          {approved ? (
            <>
              <Text style={paragraph}>
                Your request to become an organizer on Seattle Third Spaces has
                been approved! You can now create and manage places and events.
              </Text>
              <Button
                style={button}
                href={`${process.env.NEXT_PUBLIC_APP_URL}/organizer`}
              >
                Go to your dashboard
              </Button>
            </>
          ) : (
            <Text style={paragraph}>
              Thank you for your interest in becoming an organizer. After
              review, we are unable to approve your request at this time. If you
              believe this was in error or your circumstances have changed, you
              are welcome to submit a new request in the future.
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>Seattle Third Spaces</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default OrganizerRequestDecision

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
