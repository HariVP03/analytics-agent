import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { createVertex } from '@ai-sdk/google-vertex';
import { createOpenAI } from '@ai-sdk/openai';

const client_email = process.env.GOOGLE_CLIENT_EMAIL ?? '';
const private_key = process.env.GOOGLE_PRIVATE_KEY ?? '';

export const openAI = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const vertex = createVertex({
  googleAuthOptions: {
    credentials: {
      client_email,
      private_key,
    },
  },
});

export const geminiProModel = vertex('gemini-2.5-flash', {
  structuredOutputs: true,
});

export const vertexModel = vertex('gemini-2.5-pro');

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': vertex('gemini-2.5-flash', {}),
        'chat-model-reasoning': wrapLanguageModel({
          model: vertex('gemini-2.5-pro', {}),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': vertex('gemini-2.5-flash', {}),
        'artifact-model': vertex('gemini-2.5-flash', {}),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
