import {
    EmbedField,
    EmbedFieldData,
    EmojiResolvable,
    Message,
    MessageEmbed,
    MessageEmbedOptions,
    MessageReaction,
    TextChannel,
    User
} from 'discord.js';
import { BehaviorSubject } from 'rxjs';
import logger from '../../../lib/logger';
import Bot from '../../bot';
import { unicodeEmojiAlphabet } from '../util';

const MAX_ITEMS_PER_PAGE = 16;
const ALPHABET = unicodeEmojiAlphabet();
const CONTROLS = {
    CANCEL: '❌',
    CONFIRM: '✅',
    PREVIOUS: '◀️',
    NEXT: '▶️'
}

// TODO: http://xahlee.info/comp/unicode_circled_numbers.html
// TODO: Save reactions for each page and restore on page switch 
// TODO: (possibly with circled numbers (only bot changes reaction))

export class ListEmbed<T extends Exclude<EmbedFieldData, 'inline'>> {
    private message?: Message;
    private embed: MessageEmbed;
    private pages: Page<T>[] = [];
    private selections: EmojiResolvable[][] = [];
    private currentPageIndex = new BehaviorSubject(0);

    /**
     * Creates a multipage embed that can be browsed via reactions.
     * Useful when you have more fields than one embed can hold 
     * but don't want multiple embeds.
     * @param items The fields you 
     * @param options Footer will be overwritten when multiple pages are needed
     */
    public constructor(
        items: T[],
        private options?: ListEmbedOptions
    ) {
        if (items.length <= MAX_ITEMS_PER_PAGE) {
            logger.warn('List embed was used where a normal embed would suffice.');
        }
        this.embed = new MessageEmbed(options);
        // Groups the items into pages and stores them in thew instance
        this.initPages(items);
        // Setup the listener for page changes
        this.currentPageIndex.subscribe(async (pageNumber) => {
            this.embed.fields = this.pages[pageNumber].getFields();
            this.embed.setFooter(`Use the arrow reactions to switch pages\n\nPage ${pageNumber}/${this.pages.length}`)

            await this.resetSelectors();
            await this.message?.edit(this.embed);
        });
    }

    public async send(channel: TextChannel): Promise<Message> {
        this.message = await channel.send(this.embed);

        if (!this.options?.selectable) {
            return this.message;
        }
        await this.addControls();
        await this.addSelectors(this.pages[0].);
    }

    private async addControls(): Promise<void> {
       
        const reactionCollector = this.message!.createReactionCollector(
            (_reaction: MessageReaction, user: User) => user.id !== Bot.instance?.user?.id
        );
        reactionCollector.on('collect', async (
            reaction: MessageReaction,
            user: User
        ) => {
            switch(reaction.emoji.toString()){
                case CONTROLS.CANCEL: {
                    await this.message?.delete();
                    break;
                }
                case CONTROLS.CONFIRM: {
                    // Gather all selected items from the cached pages and return them to an "onfinished" event
                }
                case CONTROLS.NEXT: {
                    const newPage = this.currentPageIndex.getValue() + 1;
                    if(newPage < this.pages.length){

                    }
                    this.currentPageIndex.next()
                    break;
                }
                case CONTROLS.PREVIOUS: {
                    await this.message?.delete();
                    break;
                }
            }
        });

        // Adds control buttons
        await Promise.all(Object.values(CONTROLS).map(this.message!.react));
    }

    private async addSelectors(fields: EmbedField[]): Promise<void> {
        const reactionCollector = this.message!.createReactionCollector(
            (_reaction: MessageReaction, user: User) => user.id !== Bot.instance?.user?.id
        );
        reactionCollector.on('collect', async (
            reaction: MessageReaction,
            user: User
        ) => {

        });
        for (const field of fields) {
            const emoji = field.name.charAt(2);
            if (ALPHABET.some((letter) => letter.toString() === emoji)) {
                await this.message?.react(field.name.charAt(2))
            }
        }
    }

    private async resetSelectors(): Promise<void> {
        if (!this.message) {
            return;
        }
        const page = this.pages[this.currentPageIndex.getValue()];
        // Removes all user reactions and stores the selected items
        (await Promise.all(this.message.reactions.cache.map((reaction) =>
            Promise.all(reaction.users.cache
                .filter((user) => user.id !== Bot.instance?.user?.id)
                .map((user) => reaction.users.remove(user))
            ).then(() => reaction)
        )))
            .map((reaction) => page.getFields().find((field) => field.name.charAt(0) === reaction.emoji.toString()))
            .filter((field) => field)
            .forEach((field) => page.setFieldSelected(field, true));

        // Removes all reactions that don't have selectors on the page
        await Promise.all(this.message.reactions.cache
            .filter((reaction) => this.embed.fields
                .map((field) => field.name.charAt(1))
                .filter((char) => char !== ' ')
                .includes(reaction.emoji.toString()))
            .map((reaction) => reaction.remove()));

        // Add all missing selections
        await Promise.all(this.message.reactions.cache
            .map((reaction) => reaction.emoji)
            .filter((emoji) => this.embed.fields
                .map((field) => field.name.charAt(0))
                .includes(emoji.toString()))
            .map(this.message.react));
    }

    private initPages(items: T[]): void {
        const requiredPages = Math.floor(items.length / MAX_ITEMS_PER_PAGE + .5) + 1;
        for (let pageNumber = 0; pageNumber < requiredPages; pageNumber++) {
            const start = MAX_ITEMS_PER_PAGE * pageNumber;
            const end = MAX_ITEMS_PER_PAGE + start;
            const page = new Page(items.slice(start, end), this.options?.selectable);
            this.pages.push(page);
        }
    }
}

class Page<T extends Exclude<EmbedFieldData, 'inline'>> {
    private fields: EmbedField[] = [];
    public constructor(private items: T[], selectable?: boolean) {
        this.fields = items.map((item, index) => ({
            inline: true,
            name: selectable ?
                `${ALPHABET[index]} ${item.name}` :
                item.name,
            value: item.value
        } as EmbedField));
    }
    public getItem(field: EmbedField): T | undefined {
        return this.items[this.fields.indexOf(field)];
    }
    public getFields(): EmbedField[] {
        return this.fields;
    }
    public setFieldSelected(field: EmbedField | undefined, selected: boolean): void {
        if (selected) {
            if (field && field.value.charAt(0) !== String.fromCodePoint(0x2705)) {
                field.value = String.fromCodePoint(0x2705) + field.value
            }
        } else {
            if (field && field.value.charAt(0) === String.fromCodePoint(0x2705)) {
                field.value = field.value.slice(1);
            }
        }
    }
}

export type ListEmbedEvent = 'itemSelected';
interface ListEmbedOptions extends Exclude<MessageEmbedOptions, 'fields'> {
    selectable?: boolean;
    allowControl?: 'everyone' | 'author'
}