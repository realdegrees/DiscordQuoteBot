import { VerboseError } from '../../common/errors/verbose.error';
import { GuildMessage, Reaction } from '../../common/reaction';

export const configurePrefixReaction = new Reaction<GuildMessage>(
    'prefix',
    async (message, context) => {
        if (!message.content) {
            message.channel.send('You didn\'t provide the desired prefix!');
            return;
        }
        return context.trigger.db.firestore.update(
            {
                prefix: message.content
            },
            [message.guild.id, 'config'].join('/')
        )
            .then(() => message.channel.send('I updated the prefix.'))
            .catch(() => new VerboseError('I couldn\'t update the prefix.'));
    });