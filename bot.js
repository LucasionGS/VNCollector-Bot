const Discord = require("discord.js");

/**
 * Authentication settings
 * @type {{
 * "user_id" : string,
 "token": string,
 "main_server": string
 * }}
 */
var auth = require("./auth.json");

/**
 * Main Discord Client
 */
const client = new Discord.Client();

/**
 * RichEmbed Class
 */
const Embed = Discord.RichEmbed;

/**
 * Main Server Object
 * @type {Discord.Guild}
 */
var MainServer = auth.main_server;

client.login(auth.token);

client.on("ready", async () => {
  console.log("Loading Server Data...");

  // Convert MainServer ID into object.
  MainServer = client.guilds.get(MainServer);

  // s
  console.log(commands);
  

  // When everything is done:
  console.log("VNCollector is ready!");
});

//#region Quick Functions

/**
 * Returns a Role from the search string.
 * @param {string} roleName Role name to find.
 * @returns {Discord.Role} Role Instance
 */
function getRole(roleName) {
  try {
    return MainServer.roles.find(role => role.name == roleName);
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

/**
 * Returns a Channel from the search string.
 * @param {string} channelName Channel name to find.
 * @returns {Discord.GuildChannel} Channel Instance
 */
function getChannel(channelName) {
  try {
    var chn = MainServer.channels.find(ch => ch.name == channelName);
    return chn;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

//#endregion Quick Function

//#region client.on()

client.on("guildMemberAdd", async (member) => {
  if (member.user.bot) {
    member.addRole(getRole("Bot"), "This user is a Bot and therefore will get the Bot role.").catch((reason) => {
      console.error(reason);
    });
    return;
  }
  member.addRole(getRole("New")).catch((reason) => {
    console.error(reason);
  });
  getChannel("welcome").send(`Welcome ${member}!`);
});

client.on("message", (msg) => {
  if (!msg.author.bot) {
    executeCommand(msg);
  }
});

//#endregion client.on()

/**
 * This is where the command is run.
 * @param {Discord.Message} msg 
 */
function executeCommand(msg)
{
  
  // If it is a command at all
  var fullMsg = msg.content;
  if (fullMsg.startsWith(Command.prefix)) {
    fullMsg = fullMsg.substring(Command.prefix.length);
  }
  else {
    return;
  }
  // Parsing
  var args = fullMsg.split(" ");
  var cmd = args.shift();
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (command.multi) {
      for (let i2 = 0; i2 < command.command.length; i2++) {
        const _cmd = command.command[i2];
        if (_cmd == cmd) {
          return command.fn(msg, cmd, args);
        }
      }
    }
    else {
      if (command.command == cmd) {
        return command.fn(msg, cmd, args);
      }
    }
  }
}

/**
 * The complete list of commands.
 * @type {Command[]}
 */
const commands = [];

/**
 * Command class
 */
class Command {
  /**
   * Create a new Command.
   * @param {string | string[]} command Command(s) that execute this function.
   * @param {(msg: Discord.Message, cmd: string, args: string[])} fn Function to execute.
   * @param {default_opts} opts
   */
  constructor(command, fn = (msg, cmd, args) => {}, opts = {}) {
    /**
     * Command(s) that execute this function.
     */
    this.command = command;

    /**
     * Tells whether or not this command has multiple execution words.
     */
    this.multi = true;

    if (typeof command == "string") {
      this.multi = false;
    }

    /**
     * Function to execute.
     */
    this.fn = fn;

    /**
     * Options
     * @type {default_opts}
     */
    this.opts = default_opts;

    // Applying options
    for (const key in opts) {
      if (opts.hasOwnProperty(key)) {
        const value = opts[key];
        this.opts[key] = value;
      }
    }

    commands.push(this);
  }
}

/**
 * Command prefix
 */
Command.prefix = "-";

/**
 * These are the default options for a command.  
 * Can be edited per. command with the ``opts`` parameter.
 */
const default_opts = {
  adminOnly: false,
  helpText: "No documentation yet for this command.",
  syntax: [""]
};

//#region Command Initialization
new Command(["help", "?"], (msg, cmd, args) => {
  const user = msg.author
  msg.channel.send("DM sent with commands.")

  const em = new Embed();
  em.setTitle("Commands");
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    var fieldText = "";
    if (command.opts.syntax.length > 0) {
      fieldText += "```\n";
      for (let i2 = 0; i2 < command.opts.syntax.length; i2++) {
        const _syntax = command.opts.syntax[i2];
        fieldText += _syntax+"\n";
      }
      fieldText += "```\n";
    }
    fieldText += command.opts.helpText;
    var title = command.command;
    if (command.multi) {
      title = command.command.join(" | ");
    }
    em.addField("**"+title+"**", fieldText);
  }
  user.send(em);

  console.log(default_opts);
  
}, {
  "helpText": "Displays the help text for all or a specific command."
});

new Command(["hello", "hi", "hey"], (msg) => {
  msg.channel.send("Hello "+msg.author+"!");
}, {
  "helpText": "Says hello!"
});

//#endregion Command Initialization