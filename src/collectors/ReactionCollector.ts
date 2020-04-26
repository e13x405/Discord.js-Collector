
import { Message, ReactionCollectorOptions, ReactionCollector as DjsReactionCollector,CollectorOptions as DjsCollectorOptions, CollectorFilter, User, ReactionEmoji, MessageReaction, UserResolvable, Util } from "discord.js";
import Constants from "../util/Constants";

export default class ReactionCollector {
    /**
     * @description This method can be used in multiples emoji choices.
     * @param  {CollectorOptions} options
     * @param  {Message} options.botMessage - Message from Bot to create reaction collector.
     * @param  {UserResolvable} options.user - UserResolvable who will react. 
     * @param  {string[]?} options.reactions - Array with reactions (using unicode or emoji id)
     * @param  {DjsCollectorOptions?} options.collectorOptions - Default discord.js collector options
     * @param  {Function[]?} options.onReact - Corresponding functions when clicking on each reaction
     * @param  {boolean?} options.deleteReaction - The Bot will remove reaction after user react?
     * @example 
     * const botMessage = await message.channel.send('Simple yes/no question');
     * ReactionCollector.question({
     *     user: message,
     *     botMessage,
     *     onReact: [
     *         (botMessage) => message.channel.send('You\'ve clicked in yes button!'),
     *         (botMessage) => message.channel.send('You\'ve clicked in no button!')
     *     ]
     * });
     * @note onReact(botMessage?: Message) - onReact functions can use botMessage argument.
     * @returns DjsReactionCollector
     */
    public static question(options: CollectorOptions): DjsReactionCollector {
        return this._createReactionCollector(this.verifyArguments(options));
    }
    
    /**
     * @description This method can be used in async methods, returning only boolean value, more easier to use inside if tratament or two choices.
     * @param  {AsyncCollectorOptions} options
     * @param  {Message} options.botMessage - Message from Bot to create reaction collector.
     * @param  {UserResolvable} options.user - UserResolvable who will react. 
     * @param  {string[]?} options.reactions - Array with reactions (using unicode or emoji id)
     * @param  {DjsCollectorOptions?} options.collectorOptions - Default discord.js collector options
     * @param  {boolean?} options.deleteReaction - The Bot will remove reaction after user react?
     * @example 
     * const botMessage = await message.channel.send('Simple yes/no question');
     * if (await ReactionCollector.asyncQuestion({ user: message, botMessage }))
     *     message.channel.send('You\'ve clicked in yes button!');
     * else
     *     message.channel.send('You\'ve clicked in no button!');
     * @returns Promise<boolean>
     */
    public static async asyncQuestion(options: AsyncCollectorOptions): Promise<boolean> {
        return this._createAsyncReactionCollector(this.verifyArguments(options));
    }

    /**
     * @param  {CollectorOptions | AsyncCollectorOptions} options
     * @description This method verify if collector configuration can be used, avoiding errors.
     * @returns CollectorOptions | AsyncCollectorOptions
     */
    private static verifyArguments(options: CollectorOptions | AsyncCollectorOptions): CollectorOptions | AsyncCollectorOptions {
        if (!options.reactions)
            options.reactions = Constants.DEFAULT_YES_NO_REACTIONS;

        if (!options.collectorOptions)
            options.collectorOptions = {};
        
        if (options.collectorOptions.time === undefined)
            options.collectorOptions.time = Constants.DEFAULT_COLLECTOR_TIME;
        
        if (options.collectorOptions.max === undefined)
            options.collectorOptions.max = Constants.DEFAULT_COLLECTOR_MAX_REACT;

        const syncOptions = options as CollectorOptions;
        if (syncOptions) {
            if (!syncOptions.onReact || (syncOptions.reactions && syncOptions.onReact.length !== syncOptions.reactions.length)) {
                syncOptions.onReact = [() => { return true; }, () => { return false; }];
                syncOptions.reactions = Constants.DEFAULT_YES_NO_REACTIONS;
            }
            options = syncOptions;
        }
        return options;
    }
    
    /**
     * @param  {CollectorOptions} _options
     * @returns DjsReactionCollector
     */
    private static _createReactionCollector(_options: CollectorOptions): DjsReactionCollector {
        const { botMessage, reactions, user: userResolvable, collectorOptions, onReact, deleteReaction } = _options;
        const user = botMessage.client.users.resolve(userResolvable);
        if (!user)
            throw 'Invalid input: user is undefined or invalid.';
        if (!reactions)
            throw 'Invalid input: reactions isn\'t array or is empty.';
        if (!onReact || onReact.length !== reactions.length)
            throw 'Invalid input: fx is undefined or different of reactions length.';
        
        Promise.all(reactions.map(r => botMessage.react(r))).catch(console.error);
        const filter = (r: any, u: any) => u.id === user.id && reactions.includes(r.emoji.name);
        const collector = botMessage.createReactionCollector(filter, collectorOptions);
        collector.on('collect', async (reaction: MessageReaction) => {
            const emoji = reaction.emoji.name;
            if (deleteReaction)
                reaction.users.remove(user.id);
            await onReact[reactions.indexOf(emoji)](botMessage);
        });
        return collector;
    }

    /**
     * @private
     * @static
     * @param  {AsyncCollectorOptions} _options
     * @returns DjsReactionCollector
     */
    private static async _createAsyncReactionCollector(_options: AsyncCollectorOptions): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            const { botMessage, reactions, user: userResolvable, collectorOptions, deleteReaction } = _options;
            const user = botMessage.client.users.resolve(userResolvable);
            if (!user)
                return reject('Invalid input: user is undefined or invalid.');
            if (!reactions)
                return reject('Invalid input: reactions isn\'t array or is empty.');
            if (!botMessage.guild)
                return reject('Invalid input: botMessage.guild is undefined.');
            if (!botMessage.guild || !botMessage.guild.me)
                return reject('Invalid input: botMessage.guild.me is undefined.');
            if (!botMessage.guild.me.permissionsIn(botMessage.channel).has('ADD_REACTIONS'))
                return reject('I cannot react in messages in that channel.');
        
            await Promise.all(reactions.map(r => botMessage.react(r))).catch(reject);
            const filter = (r: any, u: any) => u.id === user.id && reactions.includes(r.emoji.name);
            const collector = botMessage.createReactionCollector(filter, collectorOptions);
            collector.on('collect', async (reaction: MessageReaction) => {
                if (deleteReaction)
                    await reaction.users.remove(user.id);
                return resolve(reactions.indexOf(reaction.emoji.name) === 0 ? true : false);
            });
        });
    }
}

export interface CollectorOptions{
    botMessage: Message;
    user: UserResolvable;
    reactions?: string[];
    collectorOptions?: ReactionCollectorOptions;
    onReact?: Function[];
    deleteReaction?: boolean;
}

export interface AsyncCollectorOptions{
    botMessage: Message;
    user: UserResolvable;
    reactions?: string[];
    collectorOptions?: ReactionCollectorOptions;
    deleteReaction?: boolean;
}