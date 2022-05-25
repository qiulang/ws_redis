// const readline = require('readline').createInterface({
//     input: process.stdin,
//     output: process.stdout
//   })
  
  // readline.question(`What's your name?`, name => {
  //   console.log(`Hi ${name}!`)
  //   readline.close()
  //   setTimeout(()=> {
  //     readline.question(`How are you?`, how => {
  //       console.log(`Good to know you are ${how}!`)
  //       // readline.close()
  //     })
  //   },4000)
  // })
  
  import objectScan from 'object-scan';
  let nested = {"data":{"data":[{"id":1779044,"seid":134,"task_id":971,"auto_call_tel":"15645641236","ennNumber":"fEf2a5gBJHfbJSva7UyWXQ==","status":1,"cm_result_name":"","parent_cm_result_name":"","call_result_name":"","call_result_sub_name":"","call_times":0,"answer_times":0,"remark":"","cm_description":"","group":{"name":"bs测试技能组","gid":1000003218},"customer_status":1,"tel_info":{"id":1714918,"telephone":"15645641236"},"is_black":0,"batch_id":1145,"cm_name":"test_2","callRecord":null},{"id":1779043,"seid":134,"task_id":971,"auto_call_tel":"15645641235","ennNumber":"p9ZNF/d7wC5OhBK7JI6dkg==","status":2,"cm_result_name":"","parent_cm_result_name":"","call_result_name":"","call_result_sub_name":"","call_times":1,"answer_times":0,"remark":"","cm_description":"","group":{"name":"bs测试技能组","gid":1000003218},"customer_status":2,"tel_info":{"id":1714917,"telephone":"15645641235"},"is_black":0,"batch_id":1145,"cm_name":"test_1","callRecord":{"cc_number":"cc_bs_243_267820_00014748_1648117924_793569695","encrypted_outline_number":"","initiator_task_id":971,"customer_id":1713617,"created_at":"1648117925","updated_at":"1648117926","switch_number":"02566687671","detail":{"cc_number":"cc_bs_243_267820_00014748_1648117924_793569695","cr_detail_id":0,"flow_number":0,"customer_result":null}}},{"id":1779045,"seid":134,"task_id":971,"auto_call_tel":"15645641237","ennNumber":"4c+eFVBFWNrpXikNX7VplQ==","status":0,"cm_result_name":"","parent_cm_result_name":"","call_result_name":"","call_result_sub_name":"","call_times":0,"answer_times":0,"remark":"","cm_description":"","group":null,"customer_status":0,"tel_info":{"id":1714919,"telephone":"15645641237"},"is_black":0,"batch_id":1145,"cm_name":"test_3","callRecord":null},{"id":1779046,"seid":134,"task_id":971,"auto_call_tel":"15645641238","ennNumber":"3dTJKeCthrmuJzJ9+b7iFQ==","status":0,"cm_result_name":"","parent_cm_result_name":"","call_result_name":"","call_result_sub_name":"","call_times":0,"answer_times":0,"remark":"","cm_description":"","group":null,"customer_status":0,"tel_info":{"id":1714920,"telephone":"15645641238"},"is_black":0,"batch_id":1145,"cm_name":"test_4","callRecord":null},{"id":1779047,"seid":134,"task_id":971,"auto_call_tel":"15645641239","ennNumber":"jtFlwgA4BN8+xAoBXwJ5Rw==","status":0,"cm_result_name":"","parent_cm_result_name":"","call_result_name":"","call_result_sub_name":"","call_times":0,"answer_times":0,"remark":"","cm_description":"","group":null,"customer_status":0,"tel_info":{"id":1714921,"telephone":"15645641239"},"is_black":0,"batch_id":1145,"cm_name":"test_5","callRecord":null}],"links":{"first":"http://emicall-cmb.emicloud.com/wechat/preview_task/customersForSeat/134/243/971?page=1","last":"http://emicall-cmb.emicloud.com/wechat/preview_task/customersForSeat/134/243/971?page=1","prev":null,"next":null},"meta":{"current_page":1,"from":1,"last_page":1,"links":[{"url":null,"label":"&laquo; Previous","active":false},{"url":"http://emicall-cmb.emicloud.com/wechat/preview_task/customersForSeat/134/243/971?page=1","label":"1","active":true},{"url":null,"label":"Next &raquo;","active":false}],"path":"http://emicall-cmb.emicloud.com/wechat/preview_task/customersForSeat/134/243/971","per_page":15,"to":5,"total":5}}}
  let s = objectScan(['data.**.id'], { joined: true })(nested);
  console.log(s)
  console.log(nested.data.data[4].tel_info.id)

  const user = {
    id: 42,
    displayName: 'jdoe',
    fullName: {
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  function whois({displayName, fullName: {firstName: name}}) {
    return `${displayName} is ${name}`;
  }
  
  console.log(whois(user));

  const people = [
    {
      name: 'Mike Smith',
      family: {
        mother: 'Jane Smith',
        father: 'Harry Smith',
        sister: 'Samantha Smith'
      },
      age: 35
    },
    {
      name: 'Tom Jones',
      family: {
        mother: 'Norah Jones',
        father: 'Richard Jones',
        brother: 'Howard Jones'
      },
      age: 25
    }
  ];
  
  for (const {name: n, family: {father: f}} of people) {
    console.log('Name: ' + n + ', Father: ' + f);
  }
  