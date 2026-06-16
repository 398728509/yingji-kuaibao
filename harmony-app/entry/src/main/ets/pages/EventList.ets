// 事件列表页
import router from '@ohos.router';
import { api } from '../services/ApiService.ets';
import { Event } from '../model/DataModels.ets';

@Entry
@Component
struct EventListPage {
  @State events: Event[] = [];

  aboutToAppear() { this.loadEvents(); }

  async loadEvents() {
    const data = await api.get('/events');
    if (data) this.events = data;
  }

  build() {
    Column() {
      // 标题栏
      Row() {
        Image($r('app.media.ic_public_back'))
          .width(24).height(24)
          .onClick(() => router.back())
        Text('事件列表')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 12 })
        Blank()
      }
      .width('100%')
      .padding(16)

      List() {
        ForEach(this.events, (event: Event) => {
          ListItem() {
            Column() {
              Row() {
                Circle()
                  .width(8).height(8)
                  .fill(event.status === 'active' ? '#ff4d4f' : '#52c41a')
                Text(event.title)
                  .fontSize(15)
                  .fontWeight(FontWeight.Medium)
                  .margin({ left: 8 })
                Blank()
                Text(`v${event.latestReport?.version || '-'}`)
                  .fontSize(18)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#1a1a2e')
              }
              .width('100%')

              Text(`📍 ${event.location}`)
                .fontSize(12)
                .fontColor('#666')
                .width('100%')
                .margin({ top: 4 })
            }
            .padding(16)
            .width('100%')
            .backgroundColor('#fafafa')
            .borderRadius(12)
            .margin({ bottom: 8 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/EventDetail', params: { eventId: event.id, title: event.title } });
            })
          }
        }, (event: Event) => event.id)
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f0f2f5')
  }
}
