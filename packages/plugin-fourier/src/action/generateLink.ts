import { elizaLogger, composeContext, generateObjectDeprecated, generateObject } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
    formatMessages
} from "@elizaos/core";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';
import { generateUniqueCode } from "../utils";
import { userProfileProvider } from "../providers/userprovider";


// interface GenerateLink extends Content {
//     title: string;
//     description: string;
//     amount: string | number;
//     address: string;
//     details: object;
// }

export interface PaymentLinkContent extends Content {
    title: string;
    address: string;
    description: string;
    amount: string | number;
    details: object;
}

// Constants
const SUPABASE_URL = 'https://gowfvrwxcjffdazpttem.supabase.co';
const DEFAULT_TOKEN_TYPES = ['USDC'];
const DEFAULT_CHAINS = ['sui'];
const PAYMENT_URL_BASE = 'https://fourier-sui.vercel.app/payment';

function isPaymentLinkContent(
    content: PaymentLinkContent
): content is PaymentLinkContent {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.title === "string" &&
        typeof content.description === "string" &&
        typeof content.address === "string" &&
        typeof content.details == "object" &&
        (typeof content.amount === "string" || typeof content.amount === "number" &&
            typeof content.amount === "number")
    )
}



const paymentLinkTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "details": {name:true,email:true},
    "title": "Consulting Service",
    "description": "2-hour consulting session for web development",
    "amount": "150",
    "address": "USD"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested payment link:
- Wallet address of the recipient
- Title of the payment
- Description of the payment
- Amount to be paid
- details (details to collect)

Respond with a JSON markdown block containing only the extracted values.`;






export const generateAction: Action = {
    name: "GENERATE_PAYMENT_LINK",
    similes: ["CREATE_PAYMENT_LINK", "GET_PAYMENT_LINK", "MAKE_PAYMENT_LINK"],
    description: "Generate a payment link for users with validated profiles",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        // callback: HandlerCallback
    ) => {
        console.log("Creating a Payment Link")
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        if (!SUPABASE_KEY) {
            return false
        }
        const userProfile = await userProfileProvider.get(runtime, message, state);
        console.log(userProfile);
        console.log("validating user Profile...")
        if (userProfile === null) {
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
    ): Promise<boolean> => {
        elizaLogger.log("Create a payment Links for this user...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state)
        };

        const paymentLinkSchema = z.object({
            address: z.string(),
            title: z.string(),
            description: z.string(),
            amount: z.union([z.string(), z.number()]),
            details: z.object({})
        });


        const paymentLinkContext = composeContext({
            state,
            template: paymentLinkTemplate,
        });
        // runtime.processActions()

        const content = await generateObject({
            runtime,
            context: paymentLinkContext,
            schema: paymentLinkSchema,
            modelClass: ModelClass.SMALL,
        });

        const paymentLinkContent = content.object as PaymentLinkContent;
        const supabaseUrl = 'https://gowfvrwxcjffdazpttem.supabase.co';
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        const supabase = createClient(supabaseUrl, SUPABASE_KEY);

        if (!isPaymentLinkContent(paymentLinkContent)) {
            console.error("Invalid content for GENERATE_PAYMENT_LINK action.");
            if (callback) {
                callback({
                    text: "Unable to process payment link request. Invalid content provided.",
                    content: { error: "Invalid payment link content" },
                });
            }
            return false;
        }
        try {
            console.log(message.content.text);

            // const { data, error } = await supabase.from("users").select("*").eq('room_id', message.roomId);
            // if (data.length === 0) {
            //     callback({
            //         text: "You are not Eligible to create a payment link yet . Make sure you have created your user profile. Would you like to me to help you create a user profile",
            //         action: ""
            //     })
            // } else {
            //     const code = generateUniqueCode();
            //     const { data: Newdata, error } = await supabase.from("payments").insert([{
            //         title: content.title,
            //         code: code,
            //         payment_description: content?.description,
            //         amount: Number(content.amount),
            //         address: content.address,
            //         details: content.details,
            //         agent_id: state.agentId,
            //         user_id: data[0]?.id,
            //         token_types: ['USDC'],
            //         chains: ['sui'],
            //     }]).select();

            //     if (error) {
            //         console.error('Insert error:', error); // Debug log
            //         throw error;
            //     }
            //     callback({
            //         text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}`,
            //         content: { text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}` }
            //     })
            // }
        } catch (error) {
            // callback({
            //     text: "Unable to process Payment Link Generation.",
            //     content: { error: "Error in Payment Generation" }
            // })
        }
        return true
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey can you create a payment link for me "
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Yeah sure would you give the name ,description , amount ,address and token you for this payment."
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Can you explain why you need this details"
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Yes , sure i would need the name: for the name of the payment you are creating , description: is the description of the payment, amount: this the amount to be paid to you by your users , address : this is the address you want to recieve the funds to , token : Token to used to recieve this payment",
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Alright , help me create a payment link for my wedding contribution , i want everyone to pay 10USDC on to this my USDC address 0x62727dshsh7328"
                }
            },
            {
                user: "{{agent)}}",
                content: {
                    text: "I would create a payment link for you. please hold on a minute ..",
                    content: {
                        title: "Wedding Contribution",
                        description: "My Wedding Contribution",
                        amount: '10',
                        token: "USDC",
                        address: "0x62727dshsh7328"
                    },
                    action: "CREATE_LINK"
                }
            },
            {
                user: "{{agent)}}",
                content: {
                    text: "Would you like me to create another link for you",
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "No"
                }
            }, {
                user: "{{agent)}}",
                content: {
                    text: "Thank you for using Fourier.",
                }
            },
        ],
    ],


}

