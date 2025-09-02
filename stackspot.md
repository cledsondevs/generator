- Provedor de LLM StackSpot AI 

Como usuar ?  recebe um token autenticando e depois chame o prompt

 - Credenciais
curl --location   --request POST 'https://idm.stackspot.com/stackspot-freemium/oidc/oauth/token'  --header 'Content-Type: application/x-www-form-urlencoded'  --data-urlencode 'client_id=01e17873-9391-4209-b5fe-85b2fd3f2bdf'  --data-urlencode 'grant_type=client_credentials'  --data-urlencode 'client_secret=qTPx860qmnyi996ALBO88M34RIJ64Q868SaM97PKYczbT6uBJA0fGRRAiBCOBbT1'  

# Authenticate
export JWT=$(curl -s "https://idm.stackspot.com/$REALM/oidc/oauth/token" \
   -H 'Content-Type: application/x-www-form-urlencoded' \
   -d 'grant_type=client_credentials' \
   -d "client_id=$CLIENT_ID" \
   -d "client_secret=$CLIENT_KEY" | jq -r '.access_token')

# Chat with this agent
curl 'https://genai-inference-app.stackspot.com/v1/agent/01K45T82PF8QC64C9DNHGQWHY2/chat' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $JWT" \
  -d "{
    \"streaming\": false,
    \"user_prompt\": \"aqui seu pront",
    \"stackspot_knowledge\": false,
    \"return_ks_in_response\": false
  }"
 