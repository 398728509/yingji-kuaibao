// 素材上报页 - 支持文字、拍照、语音
import router from '@ohos.router';
import { api } from '../services/ApiService.ets';

@Entry
@Component
struct MaterialInputPage {
  @State eventId: string = '';
  @State inputType: string = 'text';
  @State textContent: string = '';
  @State submitted: boolean = false;

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>;
    this.eventId = params['eventId'] || '';
    this.inputType = params['type'] || 'text';
  }

  async submitText() {
    if (!this.textContent.trim()) return;
    const body = {
      eventId: this.eventId,
      userId: 'current_user',
      type: 'text',
      content: this.textContent
    };
    await api.post('/materials', body);
    this.submitted = true;
  }

  async submitPhoto() {
    // 实际鸿蒙 App 调用相机 API，此处为框架示意
    const body = {
      eventId: this.eventId,
      userId: 'current_user',
      type: 'photo',
      content: '拍照上报'
    };
    await api.post('/materials', body);
    this.submitted = true;
  }

  async submitVoice() {
    // 实际鸿蒙 App 调用录音 API + 语音上传
    const body = {
      eventId: this.eventId,
      userId: 'current_user',
      type: 'voice',
      content: '语音上报'
    };
    await api.post('/materials', body);
    this.submitted = true;
  }

  build() {
    Column() {
      Row() {
        Image($r('app.media.ic_public_back'))
          .width(24).height(24)
          .onClick(() => router.back())
        Text(this.inputType === 'text' ? '文字上报' : this.inputType === 'photo' ? '拍照上报' : '语音上报')
          .fontSize(18).fontWeight(FontWeight.Bold)
          .margin({ left: 12 })
        Blank()
      }
      .width('100%').padding(16)

      if (this.submitted) {
        Column() {
          Text('✅ 已提交')
            .fontSize(18).fontColor('#52c41a').fontWeight(FontWeight.Bold)
          Text('素材已成功上报，将纳入下一期快报')
            .fontSize(13).fontColor('#666').margin({ top: 8 })
          Button('返回首页')
            .margin({ top: 24 })
            .onClick(() => router.back())
        }
        .width('100%').alignItems(HorizontalAlign.Center).margin({ top: 60 })
      } else {
        Scroll() {
          Column() {
            if (this.inputType === 'text') {
              TextArea({ placeholder: '请输入现场情况描述...', text: this.textContent })
                .height(200)
                .backgroundColor('#fff')
                .borderRadius(12)
                .padding(12)
                .onChange((val: string) => { this.textContent = val; })

              Button('提交')
                .width('100%')
                .margin({ top: 16 })
                .enabled(this.textContent.trim().length > 0)
                .onClick(() => this.submitText())
            } else if (this.inputType === 'photo') {
              Column() {
                Row() {
                  Text('📷').fontSize(48)
                }
                .width(120).height(120)
                .backgroundColor('#fef7e8')
                .borderRadius(16)
                .justifyContent(FlexAlign.Center)
                .margin({ bottom: 16 })

                Text('点击上方区域拍照')
                  .fontSize(14).fontColor('#666')

                Button('拍照并上传')
                  .width('100%')
                  .margin({ top: 24 })
                  .onClick(() => this.submitPhoto())
              }
              .width('100%').alignItems(HorizontalAlign.Center).margin({ top: 40 })
            } else if (this.inputType === 'voice') {
              Column() {
                Row() {
                  Text('🎤').fontSize(48)
                }
                .width(120).height(120)
                .backgroundColor('#f6ffed')
                .borderRadius(60)
                .justifyContent(FlexAlign.Center)
                .margin({ bottom: 16 })

                Text('按住说话，松手即上报')
                  .fontSize(14).fontColor('#666')

                Button('开始录音')
                  .width('100%')
                  .margin({ top: 24 })
                  .onClick(() => this.submitVoice())
              }
              .width('100%').alignItems(HorizontalAlign.Center).margin({ top: 40 })
            }
          }
          .padding(16)
        }
      }
    }
    .width('100%').height('100%').backgroundColor('#f0f2f5')
  }
}
