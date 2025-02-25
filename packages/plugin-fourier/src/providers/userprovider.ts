import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import { createClient } from "@supabase/supabase-js";



export const userProfileProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State
    ) => {
        const supabaseUrl = 'https://gowfvrwxcjffdazpttem.supabase.co';
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        const supabase = createClient(supabaseUrl, SUPABASE_KEY);

        const { data, error } = await supabase.from("users").select("*").eq('room_id', message.roomId);
        console.log("userprofile data",data);
        if (data.length === 0) {
            return null
        }
    }
}