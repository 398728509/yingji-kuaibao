// 应急快报 - 鸿蒙 App 入口
import AbilityStage from '@ohos.app.ability.AbilityStage';
import window from '@ohos.window';

export default class MainAbility extends AbilityStage {
  onCreate() {
    console.log('🚨 应急快报 App 启动');
  }

  onWindowStageCreate(windowStage: window.WindowStage) {
    windowStage.loadContent('pages/Index.ets', (err, data) => {
      if (err.code) {
        console.error('加载主页失败：' + JSON.stringify(err));
        return;
      }
      console.log('✅ 主页加载成功');
    });
  }
}
