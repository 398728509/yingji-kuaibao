// 事件详情页 - 查看快报和素材
import router from '@ohos.router';
import { api } from '../services/ApiService.ets';
import { Event, Report, Material, ReportSection } from '../model/DataModels.ets';

@Entry
@Component
struct EventDetailPage {
  @State eventId: string = '';
  @State eventTitle: string = '';
  @State report: Report | null = null;
  @State materials: Material[] = [];
  @State sections: ReportSection[] = [];

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    this.eventId = params['eventId'];
    this.eventTitle = params['title'];
    this.loadData();
  }

  async loadData() {
    const rep = await api.get(`/reports/event/${this.eventId}/latest`);
    if (rep) {
      this.report = rep;
      try {
        this.sections = JSON.parse(rep.content);
      } catch (e) { this.sections = []; }
    }
    const mats = await api.get(`/materials/event/${this.eventId}`);
    if (mats) this.materials = mats;
  }

  @Builder SectionCard(section: ReportSection) {
    Column() {
      Row() {
        Text(this.getTagEmoji(section.key))
          .fontSize(14)
        Text(section.title)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 6 })
        Text(`(${section.items.length}条)`)
          .fontSize(11)
          .fontColor('#999')
          .margin({ left: 4 })
      }
      .width('100%')
      .margin({ bottom: 6 })

      Column() {
        ForEach(section.items, (item: string) => {
          Row() {
            Text('• ').fontSize(13).fontColor('#333')
            Text(item).fontSize(13).fontColor('#333')
          }
          .width('100%')
          .margin({ bottom: 2 })
        })
      }
      .width('100%')
      .padding(12)
      .backgroundColor('#fafafa')
      .borderRadius(8)
      .border({ left: { width: 3, color: this.getTagColor(section.key) } })
    }
    .width('100%')
    .margin({ bottom: 12 })
  }

  build() {
    Column() {
      // 标题
      Row() {
        Image($r('app.media.ic_public_back'))
          .width(24).height(24)
          .onClick(() => router.back())
        Text(this.eventTitle)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 8 })
        Blank()
        Text(this.report ? `v${this.report.version}` : '')
          .fontSize(12)
          .fontColor('#999')
      }
      .width('100%')
      .padding(16)

      Scroll() {
        Column() {
          if (this.report) {
            // 快报摘要
            Column() {
              Row() {
                Text(this.getStatusBadge(this.report.status))
                  .fontSize(11)
                  .fontColor('#fff')
                  .backgroundColor(this.report.status === 'final' ? '#52c41a' : '#fa8c16')
                  .borderRadius(8)
                  .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                Text(`第${this.report.version}版 · ${this.formatTime(this.report.created_at)}`)
                  .fontSize(12)
                  .fontColor('#999')
                  .margin({ left: 8 })
              }
              .margin({ bottom: 4 })

              Text(this.report.summary || '暂无摘要')
                .fontSize(13)
                .fontColor('#333')
                .lineHeight(20)
            }
            .padding(16)
            .width('100%')
            .backgroundColor('#fafafa')
            .borderRadius(12)
            .border({ left: { width: 3, color: '#1890ff' } })
            .margin({ bottom: 16 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/ReportView', params: { eventId: this.eventId, reportId: this.report.id } });
            })

            // 各板块
            ForEach(this.sections, (section: ReportSection) => {
              this.SectionCard(section)
            })
          } else {
            Text('暂无快报')
              .fontSize(14)
              .fontColor('#999')
              .margin({ top: 60 })
          }
        }
        .padding({ left: 16, right: 16 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f0f2f5')
  }

  getTagEmoji(key: string): string {
    const emojis: Record<string, string> = {
      event_overview: '📋', casualties: '⚠️',
      response_progress: '🚑', coordination: '📞', site_conditions: '🏚️'
    };
    return emojis[key] || '📄';
  }

  getTagColor(key: string): string {
    const colors: Record<string, string> = {
      event_overview: '#1890ff', casualties: '#ff4d4f',
      response_progress: '#52c41a', coordination: '#fa8c16', site_conditions: '#722ed1'
    };
    return colors[key] || '#999';
  }

  getStatusBadge(status: string): string {
    return status === 'final' ? '已定稿' : '待审阅';
  }

  formatTime(t: string): string {
    if (!t) return '';
    return t.substring(11, 16);
  }
}
