import * as Misskey from 'misskey-js';
import fetch from "node-fetch";
import WebSocket from 'ws';

import config from "./config.js";

let iName: string = '邀请喵';

const helpHandler = async () => {
    return [
      `${iName} 使用帮助\n` +
      "指令 - 说明\n" +
      "-------------------\n" +
      "帮助 - 打印此条帮助信息\n" +
      "邀请 - 获取一个邀请码。"
    ];
}

const coolDownQueue = new Map<string, Date>();

const cli = new Misskey.api.APIClient({
    origin: config.misskey.url,
    credential: config.misskey.token,
    fetch: fetch,
});

const stream = new Misskey.Stream(
  config.misskey.url,
  {
      token: config.misskey.token,
  },
  {
      WebSocket: WebSocket,
  }
);

const inviteHandler = async (user: string) => {
    if (coolDownQueue.has(user)) {
        const time = <Date>coolDownQueue.get(user);
        const now = new Date();
        const diff = Math.ceil((now.getTime() - time.getTime()) / 1000);
        if (diff < config.invite.coolDown) { // wait
            return [`您还需要等待 ${config.invite.coolDown - diff} 秒才能再次获取邀请码。`];
        } else {
            // Remove from cool down queue
            coolDownQueue.delete(user);
        }
    }

    try {
        const res = await cli.request('admin/invite', {}, config.misskey.token);
        if (res !== null) {
            coolDownQueue.set(user, new Date());
            return [`邀请码获得成功！您的邀请码为: \`${res.code}\``, `请注意每个邀请码只能使用一次。`];
        } else {
            console.log('inviteHandler: res is null');
            return [`邀请码获取失败（端点返回错误），请稍后再试。`];
        }
    } catch (e) {
        console.log(e);
        return [`邀请码获取失败（系统内部错误），请稍后再试。`];
    }
}

const commandHandler = async (text: string, user: string): Promise<string[]> => {
    if (text === "邀请" || text === "邀请码" || text === "invite") {
        return (await inviteHandler(user));
    } else {
        return (await helpHandler());
    }
}

(async ()=>{
    console.log(`System starting...`);

    const meta = await cli.request('meta', { detail: true });
    console.log(`${meta.name} connected!`);

    const i = await cli.request('i', {}, config.misskey.token);
    console.log(`Identity confirm, I'm ${i.name}.`);
    iName = i.name;

    stream.on('_connected_', () => {
        console.log(`Stream connected!`);
    });

    stream.on('_disconnected_', () => {
        console.log('Stream disconnected!');
    });

    console.log('Connecting to Main channel...');

    const mainChannel = stream.useChannel('main');

    mainChannel.on('messagingMessage', async message => {
        if (message.userId !== i.id) {

            try {
                await cli.request('messaging/messages/read', {
                    messageId: message.id,
                });

                let res: string[];

                if (message.user.host) {
                    res = ['很抱歉，本服务仅限当前实例用户使用。'];
                } else {
                    res = await commandHandler(message.text?.replace(/\s/g, '') || '', message.userId);
                }

                for (const text of res) {
                    await cli.request('messaging/messages/create', {
                        userId: message.userId,
                        text,
                    }, config.misskey.token);
                }

            } catch (e) {
                console.log(e);
            }
        }
    });
})();
