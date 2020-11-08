import { extname } from 'path';
import ytdl from 'ytdl-core-discord';
import logger from '../../../lib/logger';
import { VerboseError } from '../../common/errors/verbose.error';
import { GuildMessage, Reaction } from '../../common/reaction';
import { audioUpdateReaction } from './update.reaction';


export const audioAddReaction = Reaction.create<GuildMessage, AudioInfo>({ name: 'add' }, async (
    context,
    audio) => {
    return context.trigger.db.firestore.store(
        audio,
        [context.message.guild.id, 'audio', 'commands', audio.command].join('/'),

    )
        .then(() => context.message.channel.send('I stored your new command!'))
        .catch((e) => {
            logger.error(e);
            throw new VerboseError(
                'Error storing the command, if the command already exists try \''
                + audioUpdateReaction + '\' to change the command.'
            );
        });
}, {
    pre: async (context) => {
        const [
            command,
            url,
            duration,
            start,
        ] = context.message.content.split(' ').map((arg) => arg.trim());


        const attachment = context.message.attachments.first();
        if (!command) {
            throw new VerboseError('You didn\'t provide a name for your command');
        }
        if (duration && Number.isNaN(new Number(duration))) {
            throw new VerboseError('The duration you provided is not a number');
        }
        if (start && Number.isNaN(new Number(start))) {
            throw new VerboseError('The beginning timestamp you provided is not a number');
        }
        if (url) {


            try {
                const info = await ytdl.getBasicInfo(url);

                const startTime = (() => {
                    const param = new URL(url).searchParams.get('t');
                    const arg = start.length > 0 ? start : undefined;
                    const startTime = new Number(
                        arg ?? param ?? 0
                    ).valueOf();
                    return Number.isNaN(startTime) ? 0 : startTime;
                })();
                const endTime = duration ?
                    startTime + new Number(duration).valueOf() :
                    info.videoDetails.lengthSeconds;

                const time = {
                    start: startTime,
                    end: endTime,
                } as AudioRange;

                const cleanUrl = (() => {
                    const urlObj = new URL(url);
                    urlObj.searchParams.delete('t');
                    return urlObj.toString();
                })();

                return {
                    command,
                    time,
                    url: cleanUrl,
                    source: 'youtube'
                };
            } catch (e) {
                throw new VerboseError(
                    'The provided youtube link is invalid or the video is not available!'
                );
            }
        } else if (attachment) {
            const attachmentData = attachment;
            const fileType = extname(attachmentData.url);
            if (fileType !== '.mp3') {
                throw new VerboseError('The provided attachment is not an mp3!');
            }

            return {
                command,
                url: attachmentData.url,
                source: 'discord',
                fileType: fileType.replace('.', '')
            };
        } else {
            throw new VerboseError(
                'You must either attach an audio file or provide a youtube link!'
            );
        }
    }
});

export interface AudioInfo {
    url: string;
    command: string;
    source: 'discord' | 'youtube';
    fileType?: string;
    time?: AudioRange;
}
export interface AudioRange {
    /** Timestamp where the clip ends */
    end: number;
    /** Timestamp where the clip starts */
    start: number;
}