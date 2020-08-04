let tmp =
  '{"code":200,"info":"Success","data":[{"id":10000,"parent_id":0,"order":0,"icon":"siderbar-icon-home","name":"\u5750\u5e2d\u9996\u9875","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u9996\u9875","frontend_route":"/statistics","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]},{"id":11000,"parent_id":0,"order":0,"icon":"siderbar-icon-call","name":"\u901a\u8bdd","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u901a\u8bdd","frontend_route":"/call","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[{"id":11001,"parent_id":11000,"order":0,"icon":"","name":"\u5750\u5e2d\u901a\u8bdd\u8bb0\u5f55","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u901a\u8bdd\u8bb0\u5f55","frontend_route":"/call_record","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]},{"id":11002,"parent_id":11000,"order":1,"icon":"","name":"\u901a\u8bdd\u5f39\u5c4f","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u901a\u8bdd\u5f39\u5c4f","frontend_route":"/call_screen","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]},{"id":11003,"parent_id":11000,"order":2,"icon":"","name":"\u5916\u547c\u4efb\u52a1","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u5916\u547c\u4efb\u52a1","frontend_route":"/outcall_task","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]}]},{"id":12000,"parent_id":0,"order":0,"icon":"monitor-icon-siderbar","name":"\u76d1\u63a7","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u76d1\u63a7","frontend_route":"/monitor","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[{"id":12001,"parent_id":12000,"order":0,"icon":"","name":"\u4eca\u65e5\u76d1\u63a7","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u4eca\u65e5\u76d1\u63a7","frontend_route":"/today_monitor","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]},{"id":12002,"parent_id":12000,"order":0,"icon":"","name":"\u5b9e\u65f6\u76d1\u63a7","slug":null,"http_method":[],"http_path":"","is_menu":3,"menu_name":"\u5b9e\u65f6\u76d1\u63a7","frontend_route":"/time_monitor","is_protected":4,"description":"","created_at":0,"updated_at":0,"children":[]}]}]}'
let input = JSON.parse(tmp).data

/** 菜单项
 * @typedef {object} Menu
 * @property {string} icon 图标对应的class
 * @property {string} menu_name 菜单名称
 * @property {string} frontend_route 路由
 * @property {Menu[]} children 包含的子菜单项
 */
/** @type {Menu[]} */

function walk(menuInput) {
  if (!menuInput) {
    console.log('null or empty')
    return
  }
  let menus = []
  for (const item of menuInput) {
    let i = {}
    i.icon = item.icon
    i.menu_name = item.menu_name
    i.frontend_route = item.frontend_route
    menus.push(i)
    if (item.children.length > 0) {
      i.children = walk(item.children)
    }
  }
  return menus
}

var a

walk()
walk('')
walk(a)

let menus = walk(input)
console.log(JSON.stringify(menus))
