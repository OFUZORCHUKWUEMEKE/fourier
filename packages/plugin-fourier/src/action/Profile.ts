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

interface Profile extends Content {
    name: string;
    username: string;
    description: string;
    phone: string | number;
    businesstype: string;
    email: string;
}
function isProfile(
    content: Profile
): content is Profile {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.name === "string" &&
        typeof content.username === "string" &&
        typeof content.description == "string" &&
        typeof content.email === "string" &&
        typeof content.businesstype === "string" &&
        (typeof content.phone === "string" || typeof content.phone === "number" &&
            typeof content.phone === "number")
    )
}
const SUPABASE_URL = 'https://gowfvrwxcjffdazpttem.supabase.co';
const createProfileTemplate = `Respond with a JSON markdown block containing only the extracted values. Ask the user politely for these details,
name , description , username , phone , email and businesstype

Example response:
\`\`\`json
{
   "name":"Emekes Business",
   "description":"My Business "
   "username":"emeke",
   "phone":07036226327,
   "email":"uniben2018@gmail.com"
   "businesstype":"crypto DAO"
}
\`\`\`
Given the recent messages , extract the following information about the requested user profile:
-Name of the Business,DAO 
-Username of the Business , this would be required
-Description of your business
-Phone number of the business
-Email of the Business , used for verification of user profile
-Businesstype like the type of business e.d DAO Project

Here are the recent user messages for context:
{{recentMessages}}
`

export const createProfile: Action = {
    name: "CREATE_PROFILE",
    description: "Checks if the user has created a profile if not create a profile for the user",
    similes: ["CREATE_PROFILE", "GENERATE_PROFILE", "SETUP_PROFILE", "INITIALIZE_PROFILE", "REGISTER_PROFILE", "CREATE_ACCOUNT", "SET_PROFILE", "PROFILE_SETUP"],
    validate: async (
        runtime: IAgentRuntime,
    ) => {
        console.log("Checking Users Profile")
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
        console.log("Make sure you create profile")
        const getContent = composeContext({
            state,
            template: createProfileTemplate
        })
        const content = await generateObjectDeprecated({
            runtime,
            context: getContent,
            modelClass: ModelClass.SMALL
        });

        const transferContent = content as Profile;
        const supabaseUrl = SUPABASE_URL;
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        const supabase = createClient(supabaseUrl, SUPABASE_KEY);
        if (!isProfile(transferContent)) {
            console.error("Make sure you provide the necessary details for creation of profile , like name , email , phonenumber , email , description and businesstype");
            callback({
                text: "Make sure you provide the nessary details for creation of your user profile. name , username , phone number , email , description and businesstype"
            })
            return false
        }
        try {
            const { data } = await supabase.from("users").insert([
                {
                    name: content.name,
                    description: content.description,
                    business_type: content.business_type || null, // Optional
                    room_id: message.roomId,
                    agent_id: state.agent_id,
                }
            ]).select()
                .single();
        } catch (error) {

        }
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
                    "text": "Your profile has been created successfully! , Now you can create a payment link. Would you like to update any details?"
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