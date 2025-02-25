import type { Plugin } from "@elizaos/core";
import { generateAction } from "./action/generateLink";
import { createProfile } from "./action/Profile";
import { userProfileProvider } from "./providers/userprovider";


export const fourierPlugin: Plugin = {
    name: "fourier",
    description: "Fourier is a payment platform that helps in managing and accepting payment with Links and QR codes",
    actions: [generateAction, createProfile],
    evaluators: [],
    providers: [userProfileProvider],
}

export default fourierPlugin;