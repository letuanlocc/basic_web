const { unwrap, pick } = require('../utils/db');

const FIELDS = ['name', 'mode', 'industry', 'address', 'ward', 'city', 'phone', 'fanpage_url', 'description'];
const SELECT = '*, photos:shop_photos(id, url, caption, sort_order)';

class Shop {
  constructor(db) {
    this.db = db;
  }

  async getById(id) {
    return unwrap(await this.db.from('shops').select(SELECT).eq('id', id).maybeSingle());
  }

  /** Mỗi employer có đúng 1 cửa hàng (trigger tạo sẵn lúc đăng ký). */
  async getMine(ownerId) {
    return unwrap(await this.db.from('shops').select(SELECT).eq('owner_id', ownerId).maybeSingle());
  }

  async updateMine(ownerId, body) {
    const patch = pick(body, FIELDS);
    if (Object.keys(patch).length) {
      unwrap(await this.db.from('shops').update(patch).eq('owner_id', ownerId).select('id').single());
    }
    return this.getMine(ownerId);
  }

  async addPhoto(shopId, { url, caption, sort_order = 0 }) {
    return unwrap(
      await this.db.from('shop_photos').insert({ shop_id: shopId, url, caption, sort_order }).select('id, url, caption, sort_order').single()
    );
  }

  async removePhoto(photoId) {
    unwrap(await this.db.from('shop_photos').delete().eq('id', photoId));
    return true;
  }

  /** Đủ thông tin mới được đăng tin. */
  async isComplete(shopId) {
    return unwrap(await this.db.rpc('is_shop_complete', { p_shop_id: shopId }));
  }
}

module.exports = Shop;
