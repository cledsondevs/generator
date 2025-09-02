import axios from 'axios';

class StackSpotClient {
  constructor() {
    this.clientId = process.env.STACKSPOT_CLIENT_ID;
    this.clientSecret = process.env.STACKSPOT_CLIENT_SECRET;
    this.realm = process.env.STACKSPOT_REALM;
    this.agentId = process.env.STACKSPOT_AGENT_ID;
    this.accessToken = null;
  }

  async authenticate() {
    try {
      console.log('Authenticating with StackSpot...');
      console.log('URL:', `https://idm.stackspot.com/${this.realm}/oidc/oauth/token`);
      console.log('Client ID:', this.clientId);

      const response = await axios.post(
        `https://idm.stackspot.com/${this.realm}/oidc/oauth/token`,
        new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'client_credentials',
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      console.log('Authentication successful');
      return this.accessToken;
    } catch (error) {
      console.log('Authentication error:', error.response?.data);
      console.log('Status:', error.response?.status);
      throw new Error(`StackSpot authentication failed: ${error.message}`);
    }
  }

  async chat(userPrompt) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const response = await axios.post(
        `https://genai-inference-app.stackspot.com/v1/agent/${this.agentId}/chat`,
        {
          streaming: false,
          user_prompt: userPrompt,
          stackspot_knowledge: false,
          return_ks_in_response: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expirou, tentar autenticar novamente
        await this.authenticate();
        return this.chat(userPrompt);
      }
      throw new Error(`StackSpot chat failed: ${error.message}`);
    }
  }
}

export default StackSpotClient;