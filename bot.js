const fs = require("fs");
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

/**
 * @type {{user_id:{id: string, lvl: number, xp: number, lastMsgTime: number}}}
 */
var userData = { };

/**
 * @type {[{"lvl": number, "role": string}]}
 */
var ranks = [
  {
    "lvl": 1,
    "role": "New"
  },
  {
    "lvl": 5,
    "role": "Regular"
  }
];


// Auto save data every 10 minutes
setInterval(() => {
  saveUserData();
}, 600000);

client.login(auth.token);

client.on("ready", async () => {
  console.log("Checking and loading Server Data...");
  try {
    userData = JSON.parse(fs.readFileSync("users.json"));
  } catch (error) {
    console.error("Failed parsing users.json");
  }

  // Convert MainServer ID into object.
  MainServer = client.guilds.get(MainServer);
  
  // When everything is done:
  console.log("VNCollector is ready!");
});

//#region Quick Functions

/**
 * 
 * @param {string} user_id 
 * @param {Discord.Message} msg 
 */
function gainXP(user_id, msg)
{
  if (!userData[user_id]) {
    userData[user_id] = {
      "id": user_id,
      "lvl": 1,
      "xp": 0,
      "lastMsgTime": Date.now() - 10000
    };
  }

  if (userData[user_id].lastMsgTime + 5000 > Date.now()) {
    return; console.log("Too recent!");
    
  }
  userData[user_id].lastMsgTime = Date.now();
  userData[user_id].xp += 1;

  var xp = userData[user_id].xp;
  var lvl = userData[user_id].lvl;
  // Gain LEVEL
  if (xp > xpToNextLevel(user_id)) {
    levelUp(user_id, msg);
  }
}

/**
 * Level up a user.
 * @param {string} user_id User ID
 * @param {Discord.Message} msg 
 */
function levelUp(user_id, msg)
{
  msg.channel.send(`${msg.author} just reached level ${++userData[user_id].lvl}`);
  for (let i = 0; i < ranks.length; i++) {
    const rank = ranks[i];
    if (userData[user_id].lvl == rank.lvl) {
      var user = msg.guild.members.get(msg.author.id);
      msg.channel.send(`${msg.author} also just reached a higher rank!`);
      try {
        user.removeRole(getRole(ranks[i-1].role));
      } catch { }
      user.addRole(getRole(rank.role));
      break;
    }
  }
}

/**
 * Check how much XP next level needs.
 * @param {string} user_id The user ID to check for.
 * @param {boolean} remaining If ``true``, returns only remaining xp until next level.
 */
function xpToNextLevel(user_id, remaining = false) {
  var full = (userData[user_id].lvl+5)*1.5;
  if (remaining) {
    return full - userData[user_id].xp;
  }
  else {
    return full;
  }
}

function saveUserData() {
  fs.writeFile("users.json", JSON.stringify(userData), () => { });
}

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
  if (member.user.bot && member.guild.id == auth.main_server) {
    member.addRole(getRole("Bot"), "This user is a Bot and therefore will get the Bot role.").catch((reason) => {
      console.error(reason);
    });
    return;
  }
  member.addRole(getRole("New")).catch((reason) => {
    console.error(reason);
  });
  getChannel("welcome").send(`Welcome ${member}!\n
  Start talking in #general and tell us who you are and what you like.`);
});

client.on("message", (msg) => {
  if (!msg.author.bot) {
    // gainXP(msg.author.id, msg);
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
          if (!command.opts.adminOnly) {
            return command.fn(msg, cmd, args);
          }
          else {
            var gm = MainServer.members.get(msg.author.id);
            if (gm.hasPermission("ADMINISTRATOR")) {
              return command.fn(msg, cmd, args);
            }
            else {
              msg.channel.send("You do not have permission to use this command, as it is restricted to admins. "+gm);
            }
          }
        }
      }
    }
    else {
      if (command.command == cmd) {
        if (!command.opts.adminOnly) {
          return command.fn(msg, cmd, args);
        }
        else {
          var gm = MainServer.members.get(msg.author.id);
          if (gm.hasPermission("ADMINISTRATOR")) {
            return command.fn(msg, cmd, args);
          }
          else {
            msg.channel.send("You do not have permission to use this command, as it is restricted to admins. "+gm);
          }
        }
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
     */
    this.opts = {
      adminOnly: false,
      helpText: "No documentation yet for this command.",
      syntax: []
    };;

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
  syntax: []
};

//#region Command Initialization
new Command(["help", "?"], (msg, cmd, args) => {
  const user = msg.author
  msg.channel.send("DM sent with commands.")

  const em = new Embed();
  if (typeof args[0] == "string") {
    em.setTitle("Commands");
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      var fieldText = "";
      if (command.opts.syntax.length > 0) {
        fieldText += "```\nSomething inside";
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
  }
  else {
    msg.channel.send(msg.author+", Individual help command is not yet supposed. Use just ``"+Command.prefix+"help`` to get the full list in DM.");
  }
}, {
  "helpText": "Displays the help text for all or a specific command."
});

new Command(["nextlevel", "nl"], (msg) => {
  msg.channel.send(`${msg.author}, You have \`\`${userData[msg.author.id].xp} xp\`\` and you need \`\`${10+Math.ceil(xpToNextLevel(msg.author.id, true))} xp\`\` until next level.`);
});

new Command(["-saveUserData", "-sud"], (msg) => {
  saveUserData();
  msg.channel.send("Saved user data!");
}, {
  "adminOnly": true
});

//#endregion Command Initialization