# Server Monitoring System with Discord Bot

A TypeScript-based system for monitoring server status and sending notifications through Discord.

## Project Structure

This project consists of two main components:

1. **Server Connector** - Runs on target servers to monitor their status
2. **Discord Bot** - Communicates with connectors and provides status updates in Discord

## Setup Instructions

### Server Connector (Install on each server you want to monitor)

1. Navigate to the server-connector directory:
   ```
   cd server-connector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Create a `.env` file with your configuration:
   ```
   PORT=4120
   SECURE_MODE=false
   ```

5. Start the server:
   ```
   npm start
   ```

The server will be accessible at `http://your-server-ip:24444/status`

### Discord Bot

1. Navigate to the discord-bot directory:
   ```
   cd discord-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Create a `.env` file with your configuration:
   ```
   DISCORD_TOKEN=your_discord_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here
   CHECK_INTERVAL=300000
   ```

   Get these values from the [Discord Developer Portal](https://discord.com/developers/applications).

5. Start the bot:
   ```
   npm start
   ```

## Discord Commands

- `/status` - Check the status of all monitored servers
- `/add-server name:Server URL:http://server-ip:port` - Add a new server to monitor

## Development

For development mode with auto-reload:

```
npm run dev
```

## License

MIT 