import { env } from "@/env";
import {
  Client,
  Collection,
  GatewayIntentBits,
  type Interaction,
  REST,
  type RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  type SlashCommandBuilder,
} from "discord.js";

import { Logs } from "@/utils/logs";

Logs.info("Running in", env.NODE_ENV);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
});

export const commands = new Collection<
  string,
  {
    data: SlashCommandBuilder;
    execute: (interaction: Interaction) => void | Promise<void>;
  }
>();
const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];

(async () => {
  await import("@/events/clientReady");
  await import("@/events/guildMemberAdd");
  await import("@/events/interactionCreate");
  await import("@/events/messageCreate");

  const cmds = [
    await import("@/commands/ping"),
    await import("@/commands/pong"),
  ];
  for (const cmd of cmds) {
    commands.set(cmd.data.name, { data: cmd.data, execute: cmd.execute });
    slashCommands.push(cmd.data.toJSON());
  }

  try {
    const rest = new REST().setToken(env.DISCORD_TOKEN);

    Logs.info(
      `Started refreshing ${slashCommands.length} application (/) commands.`
    );

    await rest.put(
      Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
      {
        body: slashCommands,
      }
    );

    Logs.info(
      `Successfully reloaded ${slashCommands.length} application (/) commands.`
    );
  } catch (error) {
    Logs.error("Routes.applicationGuildCommands", error);
  }
})();
