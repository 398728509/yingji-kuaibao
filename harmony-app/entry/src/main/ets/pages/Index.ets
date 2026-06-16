// 应急快报 - 首页（信息员端）
import router from '@ohos.router';
import { api, connectWebSocket } from '../services/ApiService.ets';
import { Event } from '../model/DataModels.ets';

@Entry
@Component
struct IndexPage {
  @State events: Event[] = [];
  @State activeEvents: Event[] = [];
  @State currentEvent: Event | null = null;
  @State materialCount: number = 0;

  aboutToAppear() {
    connectWebSocket();
    this.loadEvents();
  }

  async loadEvents() {
    const data = await api.get('/events?status=active');
    if (data) {
      this.activeEvents = data;
      if (data.length > 0) {
        this.currentEvent = data[0];
        this.loadMaterialCount(data[0].id);
      }
    }
  }

  async loadMaterialCount(eventId: string) {
    const mats = await api.get(`/materials/event/${eventId}`);
    if (mats) {
      this.materialCount = mats.length;
    }
  }

  build() {
    Column() {
      // 顶部标题栏
      Row() {
        Text('🚨 应急快报')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Blank()
        Image($r('app.media.ic_public_settings'))
          .width(24).height(24)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      // 进行中事件卡片
      if (this.currentEvent) {
        Column() {
          Text('⏳ 进行中')
            .fontSize(11)
            .fontColor('#ffffff')
            .backgroundColor('rgba(255,255,255,0.2)')
            .borderRadius(10)
            .padding({ left: 8, right: 8, top: 2, bottom: 2 })
            .margin({ bottom: 8 })

          Text(this.currentEvent.title)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor('#ffffff')
            .margin({ bottom: 4 })

          Text(`📍 ${this.currentEvent.location} · ${this.currentEvent.created_at}`)
            .fontSize(12)
            .fontColor('rgba(255,255,255,0.7)')
            .margin({ bottom: 12 })

          Row() {
            Column() {
              Text(`${this.materialCount}`)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor('#ffffff')
              Text('素材')
                .fontSize(11)
                .fontColor('rgba(255,255,255,0.7)')
            }
            .margin({ right: 24 })

            Column() {
              Text(`${this.currentEvent.reportCount}`)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor('#ffffff')
              Text('已出快报')
                .fontSize(11)
                .fontColor('rgba(255,255,255,0.7)')
            }
          }
        }
        .width('100%')
        .padding(20)
        .backgroundColor('#1a1a2e')
        .borderRadius(16)
        .margin({ left: 16, right: 16, bottom: 16 })
      }

      // 快速上报按钮
      Text('快速上报')
        .fontSize(13)
        .fontColor('#666')
        .margin({ left: 16, bottom: 8 })
        .width('100%')

      Row() {
        this.QuickBtn('✏️', '文字', () => {
          router.pushUrl({ url: 'pages/MaterialInput', params: { eventId: this.currentEvent?.id, type: 'text' } });
        })
        this.QuickBtn('📷', '拍照', () => {
          router.pushUrl({ url: 'pages/MaterialInput', params: { eventId: this.currentEvent?.id, type: 'photo' } });
        })
        this.QuickBtn('🎤', '语音', () => {
          router.pushUrl({ url: 'pages/MaterialInput', params: { eventId: this.currentEvent?.id, type: 'voice' } });
        })
        // 视频延后到 P1
        Column() {
          Text('🎬').fontSize(22)
          Text('视频').fontSize(11).fontColor('#999')
        }
        .width(72).height(72)
        .backgroundColor('#f5f5f5')
        .borderRadius(12)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
      .margin({ bottom: 20 })

      // 最新快报
      Text('最新快报')
        .fontSize(13)
        .fontColor('#666')
        .margin({ left: 16, bottom: 8 })
        .width('100%')

      Column() {
        Text(this.currentEvent?.latestReport
          ? `第${this.currentEvent.latestReport.version}版 · ${this.formatTime(this.currentEvent.latestReport.created_at)}`
          : '尚未生成快报')
          .fontSize(12)
          .fontColor('#999')
          .width('100%')
          .textAlign(TextAlign.Center)
      }
      .padding(20)
      .width('100%')
      .backgroundColor('#fafafa')
      .borderRadius(12)
      .margin({ left: 16, right: 16 })

      Blank()

      // 底部导航
      Row() {
        this.NavItem('🏠', '首页', true)
        this.NavItem('📋', '事件', false, () => {
          router.pushUrl({ url: 'pages/EventList' });
        })
        this.NavItem('📂', '历史', false)
        this.NavItem('👤', '我的', false)
      }
      .width('100%')
      .padding({ top: 8, bottom: 8 })
      .borderRadius(12)
      .backgroundColor('#ffffff')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f0f2f5')
  }

  @Builder QuickBtn(emoji: string, label: string, onClick: () => void) {
    Column() {
      Text(emoji).fontSize(22)
      Text(label).fontSize(11).fontColor('#333')
    }
    .width(72).height(72)
    .backgroundColor('#ffffff')
    .borderRadius(12)
    .shadow({ radius: 4, color: 'rgba(0,0,0,0.05)' })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .margin({ right: 8 })
    .onClick(onClick)
  }

  @Builder NavItem(emoji: string, label: string, active: boolean, onClick?: () => void) {
    Column() {
      Text(emoji).fontSize(20)
      Text(label).fontSize(10).fontColor(active ? '#1890ff' : '#999')
    }
    .width('25%')
    .alignItems(HorizontalAlign.Center)
    .onClick(onClick)
  }

  formatTime(t: string): string {
    if (!t) return ''
    return t.substring(11, 16)
  }
}
