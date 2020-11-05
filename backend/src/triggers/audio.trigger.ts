import { Trigger, TriggerMatch } from '../common/types';
import { useSubtriggerReaction } from '../reactions/default/use-subtriggers.reaction';
import { audioAddReaction } from '../reactions/audio/add.reaction';
import { audioPlayReaction } from '../reactions/audio/play.reaction';
import { audioListReaction } from '../reactions/audio/list.reaction';

export const audioTrigger = new Trigger({
    default: {
        guild: [useSubtriggerReaction],
        direct: []
    },
    sub: {
        guild: [audioAddReaction, audioPlayReaction],
        all: [audioListReaction]
    }
}, {
    commandOptions: {
        command: ['audio', 'sound'],
        match: TriggerMatch.STARTS_WITH,
    }
});