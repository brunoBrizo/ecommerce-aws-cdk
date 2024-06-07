import { Callback, Context, PreAuthenticationTriggerEvent } from "aws-lambda";

// Here the user is not authenticated yet
export async function handler(
  event: PreAuthenticationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log("event", event);

  // Throw an error on pre auth, blocking the user from signing in
  if (event.request.userAttributes.email === "") {
    // Return error to Amazon Cognito
    callback("Invalid email", event);
  }

  callback(null, event);
}
