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

const client_email = process.env.GOOGLE_CLIENT_EMAIL ?? '';
const private_key = process.env.GOOGLE_PRIVATE_KEY ?? '';

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
        'chat-model': vertex('gemini-2.5-flash', {
          useSearchGrounding: true,
        }),
        'chat-model-reasoning': wrapLanguageModel({
          model: vertex('gemini-2.5-pro', {
            useSearchGrounding: true,
          }),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': xai('grok-2-1212'),
        'artifact-model': xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
