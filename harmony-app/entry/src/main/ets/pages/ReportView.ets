// 快报详情页（指挥端阅读模式）
import router from '@ohos.router';
import { api } from '../services/ApiService.ets';
import { Report, ReportSection } from '../model/DataModels.ets';

@Entry
@Component
struct ReportViewPage {
  @State reportId: string = '';
  @State eventId: string = '';
  @State report: Report | null = null;
  @State sections: ReportSection[] = [];

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    this.reportId = params['reportId'];
    this.eventId = params['eventId'];
    this.loadReport();
  }

  async loadReport() {
    const data = await api.get(`/reports/${this.reportId}`);
    if (data) {
      this.report = data;
      try { this.sections = JSON.parse(data.content); }
      catch (e) { this.sections = []; }
    }
  }

  build() {
    Column() {
      Row() {
        Image($r('app.media.ic_public_back'))
          .width(24).height(24)
          .onClick(() => router.back())
        Text('快报详情')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .margin({ left: 12 })
        Blank()
        Text(this.report ? `第${this.report.version}版` : '')
          .fontSize(12).fontColor('#999')
      }
      .width('100%').padding(16)

      Scroll() {
        Column() {
          if (this.report) {
            Row() {
              Text(this.report.status === 'final' ? '✓ 已定稿' : '📝 待审阅')
                .fontSize(11).fontColor('#fff')
                .backgroundColor(this.report.status === 'final' ? '#52c41a' : '#fa8c16')
                .borderRadius(8).padding({ left: 6, right: 6, top: 2, bottom: 2 })
              Text(this.report.created_at).fontSize(12).fontColor('#999').margin({ left: 8 })
              Blank()
            }
            .width('100%').margin({ bottom: 16 })

            ForEach(this.sections, (section: ReportSection) => {
              Column() {
                Text(section.title)
                  .fontSize(15).fontWeight(FontWeight.Bold)
                  .margin({ bottom: 8 })
                Column() {
                  ForEach(section.items, (item: string) => {
                    Text('• ' + item).fontSize(13).fontColor('#333').lineHeight(22)
                      .width('100%').margin({ bottom: 2 })
                  })
                }
                .width('100%').padding(12)
                .backgroundColor('#fafafa').borderRadius(8)
              }
              .width('100%').margin({ bottom: 16 })
            })
          } else {
            Text('加载中...').fontSize(14).fontColor('#999').margin({ top: 60 })
          }
        }
        .padding({ left: 16, right: 16 })
      }
    }
    .width('100%').height('100%').backgroundColor('#f0f2f5')
  }
}
