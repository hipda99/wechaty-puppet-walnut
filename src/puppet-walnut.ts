/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

import {
  ContactPayload,

  FileBox,

  FriendshipPayload,

  ImageType,

  MessagePayload,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
  MiniProgramPayload,

  log,
  MessageType,
  ContactType,
  PayloadType,
}                           from 'wechaty-puppet'

import { VERSION }  from './version'
import {
  qrCodeForChatie,
  envOptions,
}                   from './config'

import {
  OfficialAccountOptions,
  OfficialAccount,
}                   from './official-account/official-account'
import {
  OAContactPayload,
  OAMessagePayload,
  OAMediaType,
}                   from './official-account/schema'

export type PuppetWalnutOptions = PuppetOptions & Partial<OfficialAccountOptions>

class PuppetWalnut extends Puppet {

  contactPhone (contactId: string, phoneList: string[]): Promise<void> {
    log.info('contactPhone(%s, %s)', contactId, phoneList)
    throw new Error('Method not implemented.')
  }

  contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void> {
    log.info('contactCorporationRemark(%s, %s)', contactId, corporationRemark)
    throw new Error('Method not implemented.')
  }

  contactDescription (contactId: string, description: string | null): Promise<void> {
    log.info('contactDescription(%s, %s)', contactId, description)
    throw new Error('Method not implemented.')
  }

  public static readonly VERSION = VERSION

  protected appId            : string
  protected appSecret        : string
  protected port?            : number
  protected token            : string
  protected webhookProxyUrl? : string
  protected personalMode?    : boolean

  protected accessTokenProxyUrl? : string

  protected oa? : OfficialAccount

  constructor (
    options: PuppetWalnutOptions = {},
  ) {
    super()
    log.verbose('PuppetWalnut', 'constructor()')

    options = {
      ...envOptions(),
      ...options,
    }

    if (options.appId) {
      this.appId = options.appId
    } else {
      throw new Error(`
        PuppetWalnut: appId not found. Please either set the WECHATY_PUPPET_OA_APP_ID environment variable, or set 'appId' optoins for PuppetWalnut.
      `)
    }

    if (options.appSecret) {
      this.appSecret = options.appSecret
    } else {
      throw new Error(`
        PuppetWalnut: appSecret not found. Please either set the WECHATY_PUPPET_OA_APP_SECRET environment variable, or set 'appSecret' options for PuppetWalnut.
      `)
    }

    if (options.token) {
      this.token = options.token
    } else {
      throw new Error(`
        PuppetWalnut: token not found. Please either set WECHATY_PUPPET_OA_TOKEN environment variabnle, or set 'token' options for PuppetWalnut.
      `)
    }

    if (options.personalMode) {
      this.personalMode = options.personalMode
    } else {
      this.personalMode = false
    }

    this.port            = options.port
    this.webhookProxyUrl = options.webhookProxyUrl

    /**
     * NOTE: if the ip address of server is dynamic, it can't fetch the accessToken from tencent server.
     * So, the accessTokenProxyUrl configuration is needed to fetch the accessToken from the specific endpoint.
     *
     * eg: accessTokenProxyUrl = 'http://your-endpoint/'
     * puppet-oa will fetch accessToken from: http://your-endpoint/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}
     */
    if (options.accessTokenProxyUrl) {
      if (options.accessTokenProxyUrl.endsWith('/')) {
        options.accessTokenProxyUrl = options.accessTokenProxyUrl.substring(0, options.accessTokenProxyUrl.length - 1)
      }
      this.accessTokenProxyUrl = options.accessTokenProxyUrl
    }
  }

  public async start (): Promise<void> {
    log.verbose('PuppetWalnut', 'start()')
    if (this.state.on()) {
      log.warn('PuppetWalnut', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    try {
      this.state.on('pending')
      this.oa = new OfficialAccount({
        appId           : this.appId,
        appSecret       : this.appSecret,
        personalMode    : this.personalMode,
        port            : this.port,
        token           : this.token,
        webhookProxyUrl : this.webhookProxyUrl,
      })
      // FIXME: Huan(202008) find a way to get the bot user information
      // Official Account Info can be customized by user, so It should be
      // configured by environment variable.
      // set gh_ prefix to identify the official-account
      this.id = `gh_${this.appId}`
      await this.oa.payloadStore.setContactPayload(this.id, { openid: this.id } as any)

      this.bridgeEvents(this.oa)
      await this.oa.start()
      this.state.on(true)
    } catch (e) {
      log.error('PuppetWalnut', 'start() rejection: %s', e)
      this.state.off(true)
    }
  }

  protected bridgeEvents (oa: OfficialAccount) {
    oa.on('message', msg => this.emit('message', { messageId: msg.MsgId }))
    oa.on('login', _ => this.emit('login', { contactId: this.id || '' }))
    oa.on('ready', _ => this.emit('ready', { data: 'ready' }))
    oa.on('logout', _ => this.emit('logout', { contactId: this.id || '', data: 'logout' }))
  }

  public async stop (): Promise<void> {
    log.verbose('PuppetWalnut', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetWalnut', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    try {
      this.state.off('pending')

      if (this.oa) {
        this.oa.removeAllListeners()
        await this.oa.stop()
        this.oa = undefined
      }

    } finally {
      this.state.off(true)
    }
  }

  public login (contactId: string): Promise<void> {
    log.verbose('PuppetWalnut', 'login()')
    // developer can set contactId
    return super.login(contactId)
  }

  public async logout (): Promise<void> {
    log.verbose('PuppetWalnut', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', { contactId: this.id, data: 'test' }) // before we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
    await this.oa?.stop()
  }

  public ding (data?: string): void {
    log.silly('PuppetWalnut', 'ding(%s)', data || '')
    setTimeout(() => this.emit('dong', { data: data || '' }), 1000)
  }

  public unref (): void {
    log.verbose('PuppetWalnut', 'unref()')
    super.unref()
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  public async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetWalnut', 'contactSelfQRCode()')
    return 'qrcode in the future ;^)'
  }

  public async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetWalnut', 'contactSelfName(%s)', name)
  }

  public async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetWalnut', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetWalnut', 'contactAlias(%s, %s)', contactId, alias)

    /**
     * 1. set
     */
    if (alias) {
      await this.oa?.updateContactRemark(contactId, alias)
      return alias
    }

    /**
     * 2. get
     */
    const contactPayload = await this.contactPayload(contactId)
    if (!contactPayload.alias) {
      log.warn('Contact<%s> has no alias', contactId)
    }
    return contactPayload.alias
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetWalnut', 'contactList()')
    const contactIdList = await this.oa?.getContactList()

    if (!contactIdList) {
      throw new Error('contactIdList found from oa store')
    }
    return contactIdList
  }

  public async contactQRCode (contactId: string): Promise<string> {
    log.verbose('PuppetWalnut', 'contactQRCode(%s)', contactId)
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetWalnut', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */

    const contactPayload = await this.contactPayload(contactId)
    const fileBox = FileBox.fromUrl(contactPayload.avatar)
    return fileBox
  }

  async contactRawPayloadParser (oaPayload: OAContactPayload): Promise<ContactPayload> {
    const payload: ContactPayload = {
      alias     : oaPayload.remark,
      avatar    : oaPayload.headimgurl,
      city      : oaPayload.city,
      friend    : true,
      gender    : oaPayload.sex,
      id        : oaPayload.openid,
      name      : oaPayload.nickname,
      phone     : [],
      province  : oaPayload.province,
      signature : '',
      star      : false,
      type      : ContactType.Individual,
      weixin    : oaPayload.unionid,
    }
    return payload
  }

  async contactRawPayload (id: string): Promise<OAContactPayload> {
    log.verbose('PuppetWalnut', 'contactRawPayload(%s)', id)

    const contactInfoPayload = await this.oa?.getContactPayload(id)
    if (!contactInfoPayload) {
      throw new Error(`can not get ContactPayload(${id})`)
    }
    return contactInfoPayload
  }

  /**
   *
   * Message
   *
   */
  public async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetWalnut', 'messageContact(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof ContactMock) {
    //   return attachment.id
    // }
    return ''
  }

  public async messageImage (
    messageId : string,
    imageType : ImageType,
  ) : Promise<FileBox> {
    log.verbose('PuppetWalnut', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof FileBox) {
    //   return attachment
    // }
    const payload: MessagePayload = await this.messagePayload(messageId)
    let fileBox: FileBox
    if (payload.type === MessageType.Image) {
      if (!payload.filename) {
        throw Error(`image message type must have filename file. <${payload}>`)
      }
      fileBox = FileBox.fromUrl(payload.filename)
    } else {
      throw Error('can"t get file from the message')
    }
    return fileBox
  }

  public async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetWalnut', 'messageRecall(%s)', messageId)
    return false
  }

  public async messageFile (id: string): Promise<FileBox> {
    log.verbose('PuppetWalnut', 'messageFile(%s)', id)

    const payload : MessagePayload = await this.messagePayload(id)
    let   fileBox : FileBox

    if (payload.type === MessageType.Image) {
      if (!payload.filename) {
        throw Error(`image message type must have filename file. <${payload}>`)
      }
      fileBox = FileBox.fromUrl(payload.filename)
    } else {
      throw Error('can"t get file from the message')
    }
    return fileBox
  }

  public async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetWalnut', 'messageUrl(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof UrlLink) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
      url   : 'https://mock.url',
    }
  }

  public async messageMiniProgram (messageId: string): Promise<MiniProgramPayload> {
    log.verbose('PuppetWalnut', 'messageMiniProgram(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof MiniProgram) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
    }
  }

  public async messageRawPayloadParser (rawPayload: OAMessagePayload): Promise<MessagePayload> {
    const payload: MessagePayload = {
      fromId    : rawPayload.FromUserName,
      id        : rawPayload.MsgId,
      timestamp : parseInt(rawPayload.CreateTime),
      toId      : rawPayload.ToUserName,
      type      : MessageType.Text,
    }
    if (rawPayload.MsgType === 'image') {
      payload.type = MessageType.Image
      if (!rawPayload.PicUrl) {
        throw Error(`Image Payload must has PicUrl field :<${JSON.stringify(rawPayload)}>`)
      }
      payload.filename = rawPayload.PicUrl
    } else if (rawPayload.MsgType === 'video') {
      payload.type = MessageType.Video
    } else if (rawPayload.MsgType === 'location') {
      payload.type = MessageType.Location
    } else if (rawPayload.MsgType === 'text') {
      payload.text = rawPayload.Content
    }
    return payload
  }

  public async messageRawPayload (id: string): Promise<OAMessagePayload> {
    log.verbose('PuppetWalnut', 'messageRawPayload(%s)', id)

    const payload = await this.oa?.payloadStore.getMessagePayload(id)

    if (!payload) {
      throw new Error('payload not found from oa store')
    }
    return payload
  }

  private async messageSend (
    conversationId: string,
    something: string | FileBox, // | Attachment
    mediatype: OAMediaType = 'image'
  ): Promise<string> {
    log.verbose('PuppetWalnut', 'messageSend(%s, %s)', conversationId, something)
    if (!this.id) {
      throw new Error('no this.id')
    }
    let msgId = null
    if (typeof something === 'string') {
      const payload = {
        content: something,
        msgtype: 'text' as const,
        touser: conversationId,
      }
      if (this.personalMode) {
        msgId = await this.oa?.sendCustomMessagePersonal(payload)
        if (!msgId) {
          throw new Error('can"t send personal CustomeMessage')
        }
      } else {
        msgId = await this.oa?.sendCustomMessage(payload)
      }
    } else if (something instanceof FileBox) {
      await this.oa?.sendFile({ file: something, msgtype: mediatype, touser: conversationId })
    }
    if (!msgId) {
      throw new Error('PuppetWalnut messageSend() can"t get msgId response')
    }
    return msgId
  }

  public async messageSendText (
    conversationId: string,
    text     : string,
  ): Promise<string> {
    return this.messageSend(conversationId, text)
  }

  public async messageSendFile (
    conversationId: string,
    file     : FileBox,
  ): Promise<string> {
    let msgtype: OAMediaType
    switch (file.mimeType) {
      case 'image/jpeg': msgtype = 'image'
        break
      case 'audio/mpeg': msgtype = 'voice'
        break
      default:
        throw new Error('Media type not supported')
    }
    return this.messageSend(conversationId, file, msgtype)
  }

  public async messageSendContact (
    conversationId: string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'messageSendUrl(%s, %s)', conversationId, contactId)

    // const contact = this.mocker.MockContact.load(contactId)
    // return this.messageSend(conversationId, contact)
  }

  public async messageSendUrl (
    conversationId: string,
    urlLinkPayload: UrlLinkPayload,
  ) : Promise<void> {
    log.verbose('PuppetWalnut', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))

    // const url = new UrlLink(urlLinkPayload)
    // return this.messageSend(conversationId, url)
  }

  public async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    // const miniProgram = new MiniProgram(miniProgramPayload)
    // return this.messageSend(conversationId, miniProgram)
  }

  public async messageForward (
    conversationId: string,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayloadParser (payload: RoomPayload) { return payload }
  public async roomRawPayload (id: string): Promise<RoomPayload> {
    log.verbose('PuppetWalnut', 'roomRawPayload(%s)', id)
    return {} as any
  }

  public async roomList (): Promise<string[]> {
    log.verbose('PuppetWalnut', 'roomList()')
    return []
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetWalnut', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetWalnut', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetWalnut', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    await this.dirtyPayload(PayloadType.Room, roomId)
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetWalnut', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetWalnut', 'roomQuit(%s)', roomId)
  }

  public async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetWalnut', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  public async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetWalnut', 'roomMemberList(%s)', roomId)
    return []
  }

  public async roomMemberRawPayload (roomId: string, contactId: string): Promise<RoomMemberPayload>  {
    log.verbose('PuppetWalnut', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  public async roomMemberRawPayloadParser (rawPayload: RoomMemberPayload): Promise<RoomMemberPayload>  {
    log.verbose('PuppetWalnut', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  public async roomAnnounce (roomId: string)                : Promise<string>
  public async roomAnnounce (roomId: string, text: string)  : Promise<void>

  public async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  /**
   *
   * Room Invitation
   *
   */
  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetWalnut', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetWalnut', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  public async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetWalnut', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }

  public async friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload> {
    return rawPayload
  }

  public async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetWalnut', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  public async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetWalnut', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'friendshipAccept(%s)', friendshipId)
  }

  /**
   *
   * Tag
   *
   */
  public async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'tagContactAdd(%s)', tagId, contactId)
    await this.oa?.addTagToMembers(tagId, [contactId])
  }

  public async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'tagContactRemove(%s)', tagId, contactId)
    await this.oa?.removeTagFromMembers(tagId, [contactId])
  }

  public async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetWalnut', 'tagContactDelete(%s)', tagId)
    await this.oa?.deleteTag(tagId)
  }

  public async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetWalnut', 'tagContactList(%s)', contactId)
    if (!this.oa) {
      throw new Error('can not find oa object')
    }

    // 1. get all of the tags
    if (!contactId) {
      const tagList = await this.oa.getContactList()
      return tagList
    }

    // 2. get the member tags
    const tagList = await this.oa.getMemberTags(contactId)
    return tagList
  }

}

export { PuppetWalnut }
export default PuppetWalnut
