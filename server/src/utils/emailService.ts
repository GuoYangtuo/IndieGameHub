import { Resend } from 'resend';

// 初始化Resend
const resend = new Resend('re_8aMwWJ9e_L9JKbEEBEx9QHMTfpy42wwXy');

// 生成6位数字验证码
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 发送验证码邮件
export const sendVerificationCode = async (
  email: string, 
  username: string, 
  verificationCode: string
): Promise<boolean> => {
  try {
    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: 'IndieGameHub <onboarding@indiegamehub.xyz>',
      to: email,
      subject: '验证您的IndieGameHub账户',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>您好，${username}！</h2>
          <p>感谢您注册IndieGameHub。您的验证码为：</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; background-color: #f5f5f5; padding: 10px; text-align: center; font-family: monospace;">${verificationCode}</h1>
          <p>请在注册页面输入此验证码以完成注册。</p>
          <p>验证码有效期为10分钟。</p>
          <p>如果您没有注册IndieGameHub账户，请忽略此邮件。</p>
          <p>谢谢！<br>IndieGameHub团队</p>
        </div>
      `
    });
    
    if (error) {
      console.error('发送验证码邮件失败:', error);
      return false;
    }
    
    console.log('验证码邮件已发送:', data);
    return true;
  } catch (error) {
    console.error('发送验证码邮件出错:', error);
    return false;
  }
};

// 发送重置密码邮件
export const sendPasswordResetEmail = async (
  email: string, 
  username: string, 
  resetToken: string
): Promise<boolean> => {
  try {
    // 构建重置密码链接
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    
    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: 'IndieGameHub <onboarding@indiegamehub.xyz>',
      to: email,
      subject: '重置您的IndieGameHub密码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>您好，${username}！</h2>
          <p>我们收到了重置您IndieGameHub账户密码的请求。请点击下面的链接重置密码：</p>
          <p><a href="${resetUrl}" style="display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">重置密码</a></p>
          <p>或者复制以下链接到浏览器地址栏：</p>
          <p>${resetUrl}</p>
          <p>如果您没有请求重置密码，请忽略此邮件。</p>
          <p>谢谢！<br>IndieGameHub团队</p>
        </div>
      `
    });
    
    if (error) {
      console.error('发送重置密码邮件失败:', error);
      return false;
    }
    
    console.log('重置密码邮件已发送:', data);
    return true;
  } catch (error) {
    console.error('发送重置密码邮件出错:', error);
    return false;
  }
}; 