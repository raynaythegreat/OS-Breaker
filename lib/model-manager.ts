import { ModelOption, ModelProvider } from "@/components/chat/ModelSelector";

export interface EnhancedModel extends ModelOption {
  category: ModelCategory;
  priority: number;
  displayName: string;
  estimatedCost?: string;
  quality?: 'low' | 'medium' | 'high' | 'premium';
  speed?: 'slow' | 'medium' | 'fast' | 'instant';
}

export type ModelCategory = 'flagship' | 'free' | 'chat' | 'code' | 'reasoning' | 'legacy' | 'hidden';

export interface ProviderModels {
  provider: ModelProvider;
  models: EnhancedModel[];
  lastUpdated: number;
}

/**
 * ModelManager - Professional model display and filtering
 * 
 * Features:
 * 1. Filters out irrelevant models (audio, tts, vision-only)
 * 2. Categorizes models (Flagship, Free, Chat/Code, etc.)
 * 3. Sorts by priority and capability
 * 4. Provides display enhancements
 * 5. Groups by provider
 */
export class ModelManager {
  
  /**
   * Hidden model patterns - these won't be shown
   */
  private static readonly HIDDEN_PATTERNS = [
    'audio', 'tts', 'whisper', 'voice', 'speech', 'sound',
    'listen', 'speak', 'hear', 'text-to-speech', 'speech-to-text',
    'dall-e', 'generation', 'image', 'vision', 'sora',
    'embedding', 'embed', 'moderation', 'classify',
    'instruct', 'completion', 'davinci', 'curie', 'babbage', 'ada',
    '-preview', '-turbo-preview',
  ];

  /**
   * Vision model patterns - these require special handling
   */
  private static readonly VISION_PATTERNS = [
    'vision', 'gpt-4-vision', 'claude-3', 'gemini-pro-vision',
  ];

  /**
   * Flagship models - latest and most capable for each provider
   */
  private static readonly FLAGSHIP_MODELS: Record<ModelProvider, string[]> = {
    claude: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet',
      'claude-sonnet-4',
      'claude-3-5-sonnet-latest',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
      'claude-3-5-haiku',
      'claude-opus-4-5',
      'claude-opus-4-1',
    ],
    openai: [
      'gpt-4o',
      'gpt-4o-mini',
      'o1',
      'o1-preview',
      'gpt-4.5',
    ],
    groq: [
      'llama-3.3-70b-versatile',
      'llama-3.3-70b',
      'mixtral-8x7b-32768',
    ],
    openrouter: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-sonnet:beta',
      'openai/gpt-4.5',
      'openai/gpt-4o',
      'google/gemini-2.0-flash',
      'qwen/qwen-3-235b-a22b',
      'deepseek/deepseek-chat-v3-0324',
      'qwen/qwen-3-30b-a3b',
      'deepseek/deepseek-r1',
      'qwen/qwen-32b',
    ],
    ollama: [
      'llama3.3',
      'llama3.2',
      'codellama',
      'mistral',
      'mixtral',
      'qwen',
      'qwen:14b',
      'qwen:32b',
      'qwen:72b',
      'gemma2',
      'deepseek-coder',
      'dolphin-mixtral',
      'phi3',
      'phi3:14b',
      'wizardcoder',
      'wizardlm2',
      'llama2',
      'llava',
      'neural-chat',
      'solar',
      'yarn-mistral',
    ],
    gemini: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-3-pro',
      'gemini-3-flash',
    ],
    fireworks: [
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/deepseek-r1',
      'accounts/fireworks/models/glm-4-9b-chat',
      'accounts/fireworks/models/glm-4-32b',
      'accounts/fireworks/models/glm-4',
      'accounts/fireworks/models/glm-4-flash',
      'accounts/fireworks/models/glm-4-7b',
      'accounts/fireworks/models/qwen3-235b-a22b',
      'accounts/fireworks/models/qwen3-30b-a3b',
      'accounts/fireworks/models/qwen3-coder-32b',
      'accounts/fireworks/models/kimi-k2-instruct',
      'accounts/fireworks/models/kimi-k2-thinking',
      'accounts/fireworks/models/gpt-oss-120b',
      'accounts/fireworks/models/gpt-oss-20b',
      'accounts/fireworks/models/minimax-m2',
      'accounts/fireworks/models/minimax-m2.1',
    ],
    mistral: [
      'mistral-large-latest',
      'codestral-latest',
      'mistral-small-latest',
    ],
    opencodezen: [
      'open-coder',
      'opencoder',
      'gpt-5.2',
      'gpt-5.2-codex',
      'gpt-5.1',
      'gpt-5.1-codex',
      'gpt-5.1-codex-max',
      'gpt-5.1-codex-mini',
      'gpt-5',
      'gpt-5-codex',
      'gpt-5-nano',
      'glm-4.7',
      'glm-4.6',
      'kimi-k2',
      'kimi-k2-thinking',
      'qwen3-coder',
      'big-pickle',
    ],
    zai: [
      'zai',
      'default',
    ],
  };

  /**
   * Free models - free tiers and open models
   */
  private static readonly FREE_MODELS: Record<ModelProvider, string[]> = {
    claude: ['claude-3-5-sonnet:free'],
    openai: ['gpt-4o-mini:free'],
    groq: ['llama-3.1-70b-versatile:free', 'mixtral-8x7b-32768:free'],
    openrouter: [
      '!free',
      ':free',
      'ollama',
      'google/gemini-2.0-flash',
    ],
    ollama: ['*'], // All Ollama models are free
    gemini: ['gemini-1.5-flash', 'gemini-2.0-flash'],
    fireworks: ['*'], // Most Fireworks models have free tiers
    mistral: ['mistral-small-latest'],
    opencodezen: [
      '*',
      'gpt-5-nano',
      'big-pickle',
    ],
    zai: ['*'],
  };

  /**
   * Legacy models - older, less capable models
   */
  private static readonly LEGACY_MODELS: Record<ModelProvider, string[]> = {
    claude: ['claude-3-opus', 'claude-3-haiku', 'claude-2'],
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    groq: ['llama2', 'llama-2'],
    openrouter: ['gpt-3', 'gpt-3.5', 'davinci', 'curie'],
    ollama: ['llama2', 'llama-13b', 'llama-7b'],
    gemini: ['gemini-pro', 'gemini-1.0-pro'],
    fireworks: [],
    mistral: ['mistral-7b', 'mistral-v0.1'],
    opencodezen: [],
    zai: [],
  };

  /**
   * Model display names - professional-looking names
   */
  private static readonly DISPLAY_NAMES: Record<string, string> = {
    // OpenAI - keep as is
    'gpt-4o': 'GPT-4 Omni',
    'gpt-4o-mini': 'GPT-4 Omni Mini',
    'o1': 'O1 Reasoning',
    'o1-preview': 'O1 Preview',
    'gpt-4': 'GPT-4',
    'gpt-4-turbo': 'GPT-4 Turbo',
    
    // Claude - keep as is
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-3-opus': 'Claude 3 Opus',
    'claude-3-haiku': 'Claude 3 Haiku',
    'claude-2': 'Claude 2',
    
    // Groq - keep as is
    'llama-3.3-70b-versatile': 'Llama 3.3 70B',
    'mixtral-8x7b-32768': 'Mixtral 8x7B',
    'llama-3.1-70b-versatile': 'Llama 3.1 70B',
    
    // OpenRouter - add premium and free models
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet (OpenRouter)',
    'anthropic/claude-3.5-sonnet:beta': 'Claude 3.5 Sonnet Beta (OpenRouter)',
    'openai/gpt-4.5': 'GPT-4.5 (OpenRouter)',
    'openai/gpt-4o': 'GPT-4 Omni (OpenRouter)',
    'openai/gpt-4o-mini': 'GPT-4 Omni Mini (OpenRouter)',
    'google/gemini-2.0-flash': 'Gemini 2.0 Flash (OpenRouter)',
    'qwen/qwen-3-235b-a22b': 'Qwen3 235B A22B (OpenRouter)',
    'qwen/qwen-3-30b-a3b': 'Qwen3 30B A3B (OpenRouter)',
    'qwen/qwen-3-4b': 'Qwen3 4B (OpenRouter)',
    'deepseek/deepseek-chat-v3-0324': 'DeepSeek V3 Chat (OpenRouter)',
    'deepseek/deepseek-r1': 'DeepSeek R1 (OpenRouter)',
    'meta-llama/llama-3.3-70b': 'Llama 3.3 70B (OpenRouter)',
    'anthropic/claude-sonnet-4': 'Claude Sonnet 4 (OpenRouter)',
    'anthropic/claude-sonnet-4:beta': 'Claude Sonnet 4 Beta (OpenRouter)',
    'openai/o1': 'O1 Reasoning (OpenRouter)',
    'openai/o1-mini': 'O1 Mini (OpenRouter)',
    'openai/o1-preview': 'O1 Preview (OpenRouter)',
    
    // Ollama - add all popular models
    'llama3.3': 'Llama 3.3 (Ollama)',
    'llama3.2': 'Llama 3.2 (Ollama)',
    'codellama': 'CodeLlama (Ollama)',
    'mistral': 'Mistral (Ollama)',
    'mixtral': 'Mixtral (Ollama)',
    'qwen': 'Qwen (Ollama)',
    'qwen:14b': 'Qwen 14B (Ollama)',
    'qwen:32b': 'Qwen 32B (Ollama)',
    'qwen:72b': 'Qwen 72B (Ollama)',
    'gemma2': 'Gemma 2 (Ollama)',
    'deepseek-coder': 'DeepSeek Coder (Ollama)',
    'dolphin-mixtral': 'Dolphin Mixtral (Ollama)',
    'phi3': 'Phi-3 (Ollama)',
    'phi3:14b': 'Phi-3 14B (Ollama)',
    'wizardcoder': 'WizardCoder (Ollama)',
    'wizardlm2': 'WizardLM 2 (Ollama)',
    'llama2': 'Llama 2 (Ollama)',
    'llava': 'LLaVA (Ollama)',
    'neural-chat': 'Neural Chat (Ollama)',
    'solar': 'SOLAR (Ollama)',
    'yarn-mistral': 'Yarn Mistral (Ollama)',
    'nomic-embed-text': 'Nomic Embed Text (Ollama)',
    'mxbai-embed-large': 'MXBAI Embed Large (Ollama)',
    
    // Gemini - keep as is
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B',
    
    // Mistral - keep as is
    'mistral-large-latest': 'Mistral Large',
    'codestral-latest': 'CodeS',
    'mistral-small-latest': 'Mistral Small',
    
    // OpenCode Zen - all GPT and other models
    'gpt-5.2': 'GPT 5.2',
    'gpt-5.2-codex': 'GPT 5.2 Codex',
    'gpt-5.1': 'GPT 5.1',
    'gpt-5.1-codex': 'GPT 5.1 Codex',
    'gpt-5.1-codex-max': 'GPT 5.1 Codex Max',
    'gpt-5.1-codex-mini': 'GPT 5.1 Codex Mini',
    'gpt-5': 'GPT 5',
    'gpt-5-codex': 'GPT 5 Codex',
    'gpt-5-nano': 'GPT 5 Nano',
    'glm-4.7': 'GLM 4.7',
    'glm-4.6': 'GLM 4.6',
    'kimi-k2': 'Kimi K2',
    'kimi-k2-thinking': 'Kimi K2 Thinking',
    'qwen3-coder': 'Qwen3 Coder 480B',
    'big-pickle': 'Big Pickle',
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    'claude-3-5-haiku': 'Claude Haiku 3.5',
    'claude-opus-4-5': 'Claude Opus 4.5',
    'claude-opus-4-1': 'Claude Opus 4.1',
    'gemini-3-pro': 'Gemini 3 Pro',
    'gemini-3-flash': 'Gemini 3 Flash',
    
    // Fireworks - add all models with proper names
    'accounts/fireworks/models/deepseek-v3': 'DeepSeek V3 (Fireworks)',
    'accounts/fireworks/models/deepseek-r1': 'DeepSeek R1 (Fireworks)',
    'accounts/fireworks/models/glm-4-9b-chat': 'GLM 4 9B Chat (Fireworks)',
    'accounts/fireworks/models/glm-4-32b': 'GLM 4 32B (Fireworks)',
    'accounts/fireworks/models/glm-4': 'GLM 4 (Fireworks)',
    'accounts/fireworks/models/glm-4-flash': 'GLM 4 Flash (Fireworks)',
    'accounts/fireworks/models/glm-4-7b': 'GLM 4 7B (Fireworks)',
    'accounts/fireworks/models/qwen3-235b-a22b': 'Qwen3 235B A22B (Fireworks)',
    'accounts/fireworks/models/qwen3-30b-a3b': 'Qwen3 30B A3B (Fireworks)',
    'accounts/fireworks/models/qwen3-coder-32b': 'Qwen3 Coder 32B (Fireworks)',
    'accounts/fireworks/models/kimi-k2-instruct': 'Kimi K2 Instruct (Fireworks)',
    'accounts/fireworks/models/kimi-k2-thinking': 'Kimi K2 Thinking (Fireworks)',
    'accounts/fireworks/models/gpt-oss-120b': 'GPT-OSS 120B (Fireworks)',
    'accounts/fireworks/models/gpt-oss-20b': 'GPT-OSS 20B (Fireworks)',
    'accounts/fireworks/models/minimax-m2': 'MiniMax M2 (Fireworks)',
    'accounts/fireworks/models/minimax-m2.1': 'MiniMax M2.1 (Fireworks)',
    'accounts/fireworks/models/llama-v3p1-70b-instruct': 'Llama 3.1 70B (Fireworks)',
    'accounts/fireworks/models/mixtral-8x7b-instruct': 'Mixtral 8x7B (Fireworks)',
  };

  /**
   * Filter and enhance models for professional display
   * @param models Raw models from API
   * @returns Enhanced models with categories and priorities
   */
  static filterAndEnhanceModels(models: ModelOption[]): EnhancedModel[] {
    return models
      .filter(model => this.shouldShowModel(model))
      .map(model => this.enhanceModel(model))
      .sort((a, b) => {
    // Sort by category priority
    const getCategory = (model: any) => model.category || this.categorizeModel(model);
    
    const categoryOrder: Record<string, number> = {
      flagship: 0,
      code: 1,
      chat: 2,
      free: 3,
      reasoning: 4,
      legacy: 5,
      hidden: 10,
    };
    
    const categoryDiff = (categoryOrder[getCategory(a)] ?? 10) - (categoryOrder[getCategory(b)] ?? 10);
        if (categoryDiff !== 0) return categoryDiff;
        
        // Within category, sort by model priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        
        // Finally sort by name
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Determine if a model should be shown
   */
  static shouldShowModel(model: ModelOption): boolean {
    const id = model.id.toLowerCase();
    const name = model.name.toLowerCase();
    
    // Check hidden patterns
    for (const pattern of this.HIDDEN_PATTERNS) {
      if (id.includes(pattern.toLowerCase()) || name.includes(pattern.toLowerCase())) {
        return false;
      }
    }
    
    // Allow vision models
    for (const pattern of this.VISION_PATTERNS) {
      if (id.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    // Allow models explicitly marked for code
    if (model.recommendedForCode) {
      return true;
    }
    
    // Chat/Code related patterns
    const chatPatterns = ['chat', 'code', 'instruct', 'assistant', 'sonnet', 'gpt', 'llama'];
    
    for (const pattern of chatPatterns) {
      if (id.includes(pattern.toLowerCase()) || name.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    // If we don't know what it is, hide it
    return false;
  }

  /**
   * Enhance a model with category and priority
   */
  static enhanceModel(model: ModelOption): EnhancedModel {
    const category = this.categorizeModel(model);
    const priority = this.getModelPriority(model);
    const displayName = this.getDisplayName(model);
    
    return {
      ...model,
      category,
      priority,
      displayName,
      quality: this.getQuality(model, category),
      speed: this.getSpeed(model),
      estimatedCost: this.getEstimatedCost(model),
    };
  }

  /**
   * Categorize a model
   */
  static categorizeModel(model: ModelOption): ModelCategory {
    const id = model.id;
    const provider = model.provider;
    
    // Check if it's a flagship model
    if (this.FLAGSHIP_MODELS[provider]?.some(fm => id.includes(fm))) {
      return 'flagship';
    }
    
    // Check if it's a free model
    if (this.FREE_MODELS[provider]?.some(fm => id.includes(fm) || fm === '*')) {
      return 'free';
    }
    
    // Check if it's code-focused
    if (model.recommendedForCode || 
        id.includes('code') || 
        id.includes('codestral') ||
        (provider === 'openai' && id.includes('gpt-4')) ||
        (provider === 'claude' && id.includes('sonnet')) ||
        (provider === 'ollama' && id.includes('code'))) {
      return 'code';
    }
    
    // Check if it's reasoning-focused
    if (id.includes('o1') || id.includes('reasoning') || id.includes('thought')) {
      return 'reasoning';
    }
    
    // Check if it's legacy
    if (this.LEGACY_MODELS[provider]?.some(lm => id.includes(lm))) {
      return 'legacy';
    }
    
    // Default for anything that passes the filter
    return 'chat';
  }

  /**
   * Get model priority (lower = higher priority)
   */
  static getModelPriority(model: EnhancedModel | ModelOption): number {
    const enhancedModel = model as EnhancedModel;
    const category = enhancedModel.category || this.categorizeModel(enhancedModel);
    
    // Flagship models get highest priority
    if (category === 'flagship') {
      return 0;
    }
    
    // Code models get high priority
    if (category === 'code') {
      return 1;
    }
    
    // For same category, sort by capability indicators
    const id = model.id.toLowerCase();
    
    if (id.includes('-latest') || id.includes('2024') || id.includes('2025')) return 0;
    if (id.includes('70b') || id.includes('72b')) return 1;
    if (id.includes('40b') || id.includes('33b') || id.includes('35b')) return 2;
    if (id.includes('7b') || id.includes('8b')) return 4;
    if (id.includes('3b') || id.includes('4b')) return 5;
    
    const modelCategory = (model as any).category || this.categorizeModel(model);
    if (modelCategory === 'free') return 10;
    if (modelCategory === 'legacy') return 20;
    
    return 3; // Default medium priority
  }

  /**
   * Get display name for a model
   */
  static getDisplayName(model: ModelOption): string {
    // Check predefined display names
    for (const [pattern, displayName] of Object.entries(this.DISPLAY_NAMES)) {
      if (model.id.includes(pattern)) {
        return displayName;
      }
    }
    
    // Clean up the name if no predefined name exists
    let name = model.name || model.id;
    
    // Remove provider prefixes
    const providerPrefixes = [
      'anthropic/', 'openai/', 'meta-llama/', 'google/',
    ];
    
    for (const prefix of providerPrefixes) {
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length);
        break;
      }
    }
    
    // Convert camelCase/kebab-case to readable
    name = name
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
    
    // Capitalize words
    name = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return name.trim() || model.id;
  }

  /**
   * Get quality rating for a model
   */
  static getQuality(model: EnhancedModel | ModelOption, category: ModelCategory): EnhancedModel['quality'] {
    if (category === 'flagship') return 'premium';
    if (category === 'legacy') return 'low';
    if (category === 'free') return 'medium';
    
    const id = model.id.toLowerCase();
    
    if (id.includes('70b') || id.includes('72b')) return 'premium';
    if (id.includes('40b') || id.includes('33b') || id.includes('35b')) return 'high';
    if (id.includes('7b') || id.includes('8b')) return 'medium';
    if (id.includes('3b') || id.includes('4b')) return 'low';
    
    return 'medium';
  }

  /**
   * Get speed rating for a model
   */
  static getSpeed(model: EnhancedModel | ModelOption): EnhancedModel['speed'] {
    const id = model.id.toLowerCase();
    
    if (id.includes('fast') || id.includes('flash') || id.includes('haiku') || id.includes('mini')) {
      return 'fast';
    }
    if (id.includes('turbo') || id.includes('8b') || id.includes('7b')) {
      return 'fast';
    }
    if (id.includes('70b') || id.includes('35b')) {
      return 'medium';
    }
    if (id.includes('o1') || id.includes('opus') || id.includes('large')) {
      return 'slow';
    }
    
    return 'medium';
  }

  /**
   * Get estimated cost indicator
   */
  static getEstimatedCost(model: EnhancedModel | ModelOption): string {
    const enhancedModel = model as EnhancedModel;
    const modelCategory = enhancedModel.category || this.categorizeModel(enhancedModel);
    
    if (modelCategory === 'free') return 'Free';
    
    const quality = enhancedModel.quality || this.getQuality(enhancedModel, modelCategory);
    if (quality === 'premium') return '$$$';
    if (quality === 'high') return '$$';
    if (quality === 'medium') return '$';
    if (quality === 'low') return '$';
    
    return '$$';
  }

  /**
   * Group models by category for display
   */
  static groupByCategory(models: EnhancedModel[]): Record<string, EnhancedModel[]> {
    const groups: Record<string, EnhancedModel[]> = {
      '⭐ Flagship Models': [],
      '🚀 Code-Focused': [],
      '💬 Chat Models': [],
      '🆓 Free Models': [],
      '🤔 Reasoning Models': [],
    };
    
    for (const model of models) {
      switch (model.category) {
        case 'flagship':
          groups['⭐ Flagship Models'].push(model);
          break;
        case 'code':
          groups['🚀 Code-Focused'].push(model);
          break;
        case 'chat':
          groups['💬 Chat Models'].push(model);
          break;
        case 'free':
          groups['🆓 Free Models'].push(model);
          break;
        case 'reasoning':
          groups['🤔 Reasoning Models'].push(model);
          break;
        case 'legacy':
          if (!groups['📦 Legacy Models']) {
            groups['📦 Legacy Models'] = [];
          }
          groups['📦 Legacy Models'].push(model);
          break;
      }
    }
    
    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, models]) => models.length > 0)
    );
  }
}