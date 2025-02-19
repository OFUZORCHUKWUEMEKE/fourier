import { elizaLogger, composeContext, generateObjectDeprecated } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { createClient } from '@supabase/supabase-js';

const isLatestMessageOlderThan24Hours = (messages: any): boolean => {
    // Get the latest message
    const latestMessage = messages.reduce((latest, current) => {
        return latest.createdAt > current.createdAt ? latest : current;
    });

    // Get current time in milliseconds
    const now = Date.now();

    // Calculate 24 hours in milliseconds
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // Check if the time difference is greater than or equal to 24 hours
    const timeDifference = now - latestMessage.createdAt;

    return timeDifference >= twentyFourHours;
};

export const onboard: Action = {
    name: "",
    description: "",
    similes: ["REGISTER", "CREATE_ACCOUNT", "NEW_USER", "SIGNUP_USER", "JOIN_NOW", "SETUP_ACCOUNT", "USER_LOGIN", "ENTER_ACCOUNT", "LOG_INTO_SYSTEM", "AUTHENTICATE"],
    validate: async (
        runtime: IAgentRuntime, message: Memory
    ) => {
        const recentMessagesData = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10,
            unique: false,
        });
        if (isLatestMessageOlderThan24Hours(recentMessagesData)) {
            return true
        } else {
            return false
        }
        return true
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<Boolean> => {
        elizaLogger.log("Creating Profile for this user...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state)
        };
        return true
    },
    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Hey, can you create a user profile for me?"
                }
            },
            {
                "user": "{{agent}}",
                "content": {
                    "text": "Sure! I'll need some details from you. Can you provide your name, email, phone number, and preferred username?"
                }
            },
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Why do you need these details?"
                }
            },
            {
                "user": "{{agent}}",
                "content": {
                    "text": "Great question! The name will help personalize your experience, email is required for account recovery and notifications, phone number is optional for two-factor authentication, and username will be your unique identifier on our platform."
                }
            },
            {
                "user": "{{user1}}",
                "content": {
                    "text": "Alright, my name is John Doe, my email is johndoe@example.com, my phone number is +1234567890, and I want my username to be johndoe123."
                }
            },
            {
                "user": "{{agent}}",
                "content": {
                    "text": "Thanks! I'm creating your profile now, please hold on...",
                    "content": {
                        "name": "John Doe",
                        "email": "johndoe@example.com",
                        "phone": "+1234567890",
                        "username": "johndoe123"
                    },
                    "action": "CREATE_PROFILE"
                }
            },
            {
                "user": "{{agent}}",
                "content": {
                    "text": "Your profile has been created successfully! Would you like to update any details?"
                }
            },
            {
                "user": "{{user1}}",
                "content": {
                    "text": "No, everything looks good."
                }
            },
            {
                "user": "{{agent}}",
                "content": {
                    "text": "Thank you for using Fourier. Have a great day!"
                }
            }
        ]
    ]
}