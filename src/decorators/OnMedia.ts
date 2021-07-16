import { Api } from 'telegram/tl'
import { NewMessage, NewMessageEvent } from "telegram/events";
import { makePropDecorator } from ".";
import { BotBase } from "./Bot";
import { PluginBase } from "./Plugin";
import { TelegramClient } from "telegram";
import { OnMessageMeta } from "./OnMessage";

export interface OnMediaDecorator {
    (obj: OnMediaMeta): any

    new(obj: OnMediaMeta): OnMediaMeta
}

export interface OnMediaMeta extends OnMessageMeta {
    types?: Array<Api.TypeMessageMedia>
}

export type MessageMediaUpdate = Api.UpdateNewChannelMessage & { message: Api.Message & { media: Api.TypeMessageMedia } }

export interface OnMediaParams {
    bot: BotBase
    client: TelegramClient
    event: NewMessageEvent
    media: Api.TypeMessageMedia
}

export const OnMedia: OnMediaDecorator = makePropDecorator(
    'OnMedia', undefined, undefined,
    (target: PluginBase, func: string, meta: OnMediaMeta) => {
        let {pattern, ...rest} = meta
        const regexp: RegExp = typeof meta.pattern === 'string' ? new RegExp(meta.pattern) : meta.pattern

        const callback = (bot: BotBase) => {
            const client = bot.client
            client.addEventHandler((event: NewMessageEvent) => {
                if (event.message.media) {
                    target[func]({bot, client, event, media: event.message.media})
                }
            }, new NewMessage({ pattern: regexp, ...rest }))
        }

        PluginBase.__register__(target.constructor, callback)
    }
)