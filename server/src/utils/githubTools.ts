import axios from 'axios';

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  private: boolean;
  description?: string;
  html_url: string;
  clone_url: string;
}

export interface GitHubValidationResult {
  isValid: boolean;
  isAccessible: boolean;
  repoInfo?: GitHubRepoInfo;
  error?: string;
}

/**
 * 从GitHub URL中提取仓库信息
 */
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    // 支持多种GitHub URL格式
    const patterns = [
      /^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^https:\/\/www\.github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/
    ];

    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
    }

    return null;
  } catch (error) {
    console.error('解析GitHub URL失败:', error);
    return null;
  }
};

/**
 * 验证GitHub仓库的可访问性
 */
export const validateGitHubRepo = async (
  repoUrl: string,
  accessToken?: string
): Promise<GitHubValidationResult> => {
  try {
    // 解析GitHub URL
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      return {
        isValid: false,
        isAccessible: false,
        error: '无效的GitHub仓库URL格式'
      };
    }

    // 准备API请求头
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'IndieGameHub-App'
    };

    // 如果提供了访问令牌，添加到请求头
    if (accessToken) {
      headers['Authorization'] = `token ${accessToken}`;
    }

    // 调用GitHub API获取仓库信息
    const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
    
    const response = await axios.get(apiUrl, {
      headers,
      timeout: 10000 // 10秒超时
    });

    if (response.status === 200) {
      const repoData = response.data;
      
      return {
        isValid: true,
        isAccessible: true,
        repoInfo: {
          name: repoData.name,
          full_name: repoData.full_name,
          private: repoData.private,
          description: repoData.description,
          html_url: repoData.html_url,
          clone_url: repoData.clone_url
        }
      };
    } else {
      return {
        isValid: true,
        isAccessible: false,
        error: `GitHub API返回状态码: ${response.status}`
      };
    }

  } catch (error: any) {
    console.error('验证GitHub仓库失败:', error);

    if (error.response) {
      // GitHub API返回了错误响应
      const status = error.response.status;
      let errorMessage = '';

      switch (status) {
        case 401:
          errorMessage = '访问令牌无效或已过期';
          break;
        case 403:
          errorMessage = '访问被拒绝，可能是访问令牌权限不足或达到API限制';
          break;
        case 404:
          errorMessage = '仓库不存在或无访问权限';
          break;
        case 422:
          errorMessage = '仓库URL格式错误';
          break;
        default:
          errorMessage = `GitHub API错误 (状态码: ${status})`;
      }

      return {
        isValid: true,
        isAccessible: false,
        error: errorMessage
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        isValid: true,
        isAccessible: false,
        error: '请求超时，请检查网络连接'
      };
    } else {
      return {
        isValid: false,
        isAccessible: false,
        error: `网络错误: ${error.message}`
      };
    }
  }
};

/**
 * 验证GitHub访问令牌
 */
export const validateGitHubToken = async (accessToken: string): Promise<boolean> => {
  try {
    const headers = {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'IndieGameHub-App'
    };

    const response = await axios.get('https://api.github.com/user', {
      headers,
      timeout: 10000
    });

    return response.status === 200;
  } catch (error) {
    console.error('验证GitHub访问令牌失败:', error);
    return false;
  }
};

/**
 * 获取仓库的基本信息（不需要令牌的公开信息）
 */
export const getPublicRepoInfo = async (repoUrl: string): Promise<GitHubValidationResult> => {
  return validateGitHubRepo(repoUrl);
};