import { TelegramClient } from "telegram";
import { EntityLike } from "telegram/define";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { makePropDecorator } from ".";
import { BotBase } from "./Bot";
import { PluginBase } from "./Plugin";

export interface OnMessageDecorator {
    (obj: OnMessageMeta): any

    new(obj: OnMessageMeta): OnMessageMeta;
}

export interface OnMessageMeta {
    chats?: EntityLike[];
    func?: (event: NewMessageEvent) => boolean;
    incoming?: boolean;
    outgoing?: boolean;
    fromUsers?: EntityLike[];
    forwards?: boolean;
    pattern?: string | RegExp;
    blacklistChats?: boolean;
}

export interface OnMessageParams {
    bot: BotBase
    client: TelegramClient
    event: NewMessageEvent
}

export const OnMessage: OnMessageDecorator = makePropDecorator(
    'OnMessage', undefined, undefined,
    (target: PluginBase, func: string, meta: OnMessageMeta) => {
        let {pattern, ...rest} = meta
        const regexp: RegExp = typeof meta.pattern === 'string' ? new RegExp(meta.pattern) : meta.pattern

        const callback = (bot: BotBase) => {
            const client = bot.client
            client.addEventHandler((event: NewMessageEvent) => {
                target[func]({bot, client, event})
            }, new NewMessage({ pattern: regexp, ...rest }))
        }

        PluginBase.__register__(target.constructor, callback)
    }
)