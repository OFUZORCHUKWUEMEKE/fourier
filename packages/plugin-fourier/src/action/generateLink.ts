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
    formatMessages
} from "@elizaos/core";
import { createClient } from '@supabase/supabase-js';
import { generateUniqueCode } from "../utils";


interface GenerateLink extends Content {
    title: string;
    description: string;
    amount: string | number;
    address: string;
    details: object;
}

// Constants
const SUPABASE_URL = 'https://gowfvrwxcjffdazpttem.supabase.co';
const DEFAULT_TOKEN_TYPES = ['USDC'];
const DEFAULT_CHAINS = ['sui'];
const PAYMENT_URL_BASE = 'https://fourier-sui.vercel.app/payment';

function isGenerateLink(
    content: GenerateLink
): content is GenerateLink {
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



const generatelinkTemplate = `Respond with a JSON markdown block containing only the extracted values (title,description,amount,address and details) , make sure you get the title of the payment and address of the user. Title of payment , amount and address for the user to send tokens is compulsory. Only extract values beginning from the last time a payment link was created from the recent messages.

Example response:
\`\`\`json
{
   "title":"Contribution for Davids Graduation Ceremony",
   "description":"This contribution is for Davids Graduation Ceremony",
   "amount":1000,
   "address":"0xhjhhi1uiuio"
   "details":{}
}
\`\`\`


Given the recent messages , extract the following information about the requested generation Link:
-Title of the Payment
-Description of the Payment , let this be the summary of the payment
-Amount of the payment , let the amount be a number e.g 10USDC -> 10 , 20USDC -> 20
-address of the user to accept payment
-other details the user wants to collect from the payer.(like name , age , job description etc)...

Here are the recent user messages for context:
{{recentMessages}}

`;

function getLatestMessage(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return null;
    }

    // Sort messages by createdAt in descending order and take the first one
    const latestMessage = messages.reduce((latest, current) => {
        return latest.createdAt > current.createdAt ? latest : current;
    });

    return {
        id: latestMessage.id,
        content: latestMessage.content,
        createdAt: new Date(latestMessage.createdAt),
        type: latestMessage.type,
        roomId: latestMessage.roomId,
        agentId: latestMessage.agentId
    };
}

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





export const generateAction: Action = {
    name: "GENERATELINK",
    similes: ["CREATE_LINK", "GENERATE LINK", "CREATE_PAYMENT"],
    description: "Generate payment Link for the user after collecting the title of payment , amount to collect , wallet address and details to collect",
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
        // console.log("recentMessages", state.recentMessagesData);
        // console.log("Latest Messages", getLatestMessage(state.recentMessagesData));
        console.log("message", message);
        const recentMessagesData = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10,
            unique: false,
        });
        // const latest = getLatestMessage(recentMessagesData);
        // console.log("latest",latest);

        // console.log(recentMessagesData);

        console.log("time difference", isLatestMessageOlderThan24Hours(recentMessagesData));

        const getContent = composeContext({
            state,
            template: generatelinkTemplate
        })
        const content = await generateObjectDeprecated({
            runtime,
            context: getContent,
            modelClass: ModelClass.SMALL
        });
        // console.log(content);
        const transferContent = content as GenerateLink;
        const supabaseUrl = 'https://gowfvrwxcjffdazpttem.supabase.co';
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        const supabase = createClient(supabaseUrl, SUPABASE_KEY);

        if (!isGenerateLink(transferContent)) {
            console.error("Make sure you provide the title of payment , amount you want to recieve , wallet address you want to recieve stablecoin and details you want your payers to fill");
            callback({
                text: "Make sure you provide the title of payment , amount you want to recieve , wallet address you want to recieve stablecoin and details you want your payers to fill",
                content: { error: "Make sure you provide the title of payment , amount you want to recieve , wallet address you want to recieve stablecoin and details you want your payers to fill" }
            })
            return false
        }
        // const { data, error } = await supabase.from("users").select("*").eq('roomId', message.roomId);

        try {
            const { data, error } = await supabase.from("users").select("*").eq('room_id', message.roomId);
            if (data.length === 0) {
                callback({
                    text: "You are not Eligible to create a payment link yet . Make sure you have created your user profile. Would you like to me to help you create a user profile",
                    action: ""
                })
                // const { data: newUser, error: createError } = await supabase
                //     .from('users')
                //     .insert([{
                //         agent_id: state.agentId,
                //         payment_links_count: 0,
                //         total_amount: 0
                //     }])
                //     .select()
                //     .single();

                // if (createError) throw createError;
                // const code = generateUniqueCode();
                // const { data, error } = await supabase.from("payments").insert([{
                //     title: content.title,
                //     code: code,
                //     payment_description: content?.description,
                //     amount: Number(content.amount),
                //     address: content.address,
                //     details: content.details,
                //     agent_id: state.agentId,
                //     user_id: newUser?.id,
                //     token_types: ['USDC'],
                //     chains: ['sui'],
                // }]).select();
                // callback({
                //     text: "Successfully created your payment link is",
                //     content: { text: `Successfully created your payment link ...` },
                //     url: `${PAYMENT_URL_BASE}/${data[0]?.id}`,
                //     attachments: [{
                //         url: `${PAYMENT_URL_BASE}/${data[0]?.id}`,
                //         title: `${content.title} payment link`,
                //         description: `${content?.description || ""}`,
                //         source: `Fourier`,
                //         text: `${content?.description || ""}`,
                //         id: `${data[0]?.id}`
                //     }]
                // })
            } else {
                const code = generateUniqueCode();
                const { data: Newdata, error } = await supabase.from("payments").insert([{
                    title: content.title,
                    code: code,
                    payment_description: content?.description,
                    amount: Number(content.amount),
                    address: content.address,
                    details: content.details,
                    agent_id: state.agentId,
                    user_id: data[0]?.id,
                    token_types: ['USDC'],
                    chains: ['sui'],
                }]).select();

                if (error) {
                    console.error('Insert error:', error); // Debug log
                    throw error;
                }
                callback({
                    text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}`,
                    content: { text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}` }
                })
            }
        } catch (error) {
            callback({
                text: "Unable to process Payment Link Generation.",
                content: { error: "Error in Payment Generation" }
            })
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

