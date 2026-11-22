/* DỮ LIỆU MINH HỌA, không phải API payload và không lưu vĩnh viễn.
 * Sơ đồ nghiệp vụ xem README.md và BA–SOA Contract v2.1.
 */
window.DEMO = {
  plots:[
    {id:'P1',name:'Ruộng A1',location:'Châu Phú, An Giang',area:2500.5,lat:10.523,lng:105.223,visible:true,seasonIds:['S1','S0']},
    {id:'P2',name:'Ruộng B2',location:'Thoại Sơn, An Giang',area:1800,lat:10.354,lng:105.298,visible:true,seasonIds:['S2']},
    {id:'P3',name:'Ruộng C3',location:'Long Xuyên, An Giang',area:3200,lat:10.386,lng:105.432,visible:true,seasonIds:['S3']}
  ],
  seasons:[
    {id:'S1',plotId:'P1',name:'Thu Đông 2026',crop:'ST25',status:'IN_PROGRESS',start:'2026-08-03',yield:1500,actual:null},
    {id:'S0',plotId:'P1',name:'Đông Xuân 2025–2026',crop:'Đài Thơm 8',status:'COMPLETED',start:'2025-12-10',yield:1420,actual:1390},
    {id:'S2',plotId:'P2',name:'Thu Đông 2026',crop:'OM18',status:'IN_PROGRESS',start:'2026-08-15',yield:1150,actual:null},
    {id:'S3',plotId:'P3',name:'Thu Đông 2026',crop:'Jasmine 85',status:'IN_PROGRESS',start:'2026-08-01',yield:1950,actual:null}
  ],
  logs:[
    {id:'LG1',seasonId:'S1',date:'2026-10-11',type:'FERTILIZING',detail:'Bón phân lần 2 cho ruộng A1',amount:40,unit:'kg'},
    {id:'LG2',seasonId:'S1',date:'2026-10-04',type:'PEST_CONTROL',detail:'Kiểm tra sâu bệnh, ghi nhận kết quả quan sát',amount:null,unit:''},
    {id:'LG3',seasonId:'S1',date:'2026-09-24',type:'WATERING',detail:'Điều tiết nước cho ruộng',amount:null,unit:''},
    {id:'LG4',seasonId:'S2',date:'2026-10-09',type:'FERTILIZING',detail:'Bón phân lần 1',amount:30,unit:'kg'}
  ],
  costs:[
    {id:'K1',seasonId:'S1',date:'2026-10-11',category:'FERTILIZER',amount:850000,detail:'Phân bón lần 2'},
    {id:'K2',seasonId:'S1',date:'2026-09-25',category:'SEED',amount:540000,detail:'Mua giống ST25'},
    {id:'K3',seasonId:'S1',date:'2026-10-04',category:'PESTICIDE',amount:320000,detail:'Vật tư phòng trừ sâu bệnh'},
    {id:'K4',seasonId:'S2',date:'2026-10-09',category:'FERTILIZER',amount:700000,detail:'Phân bón lần 1'}
  ],
  listings:[
    {id:'L1',plotId:'P1',seasonId:'S1',ownerId:'F1',status:'OPEN',expectedPrice:8500,offerIds:['O1','O2','O3'],place:'Châu Phú, An Giang',distance:2.5},
    {id:'L2',plotId:'P2',seasonId:'S2',ownerId:'F1',status:'OPEN',expectedPrice:7900,offerIds:['O4'],place:'Thoại Sơn, An Giang',distance:5.8},
    {id:'L3',plotId:'P3',seasonId:'S3',ownerId:'F1',status:'LOCKED',expectedPrice:8200,offerIds:['O5'],place:'Long Xuyên, An Giang',distance:12.1}
  ],
  offers:[
    {id:'O1',listingId:'L1',traderId:'T1',price:8450,maximumDeduction:2,status:'PENDING',message:'Tôi muốn xem thêm thời gian giao lúa.',created:'2026-10-17'},
    {id:'O2',listingId:'L1',traderId:'T2',price:8600,maximumDeduction:2,status:'ACCEPTED',message:'Tôi có thể trao đổi về điều khoản giao nhận.',created:'2026-10-16'},
    {id:'O3',listingId:'L1',traderId:'T3',price:8300,maximumDeduction:3,status:'PENDING',message:'Mong được trao đổi thêm về lịch thu mua.',created:'2026-10-15'},
    {id:'O4',listingId:'L2',traderId:'T2',price:8000,maximumDeduction:2,status:'PENDING',message:'Tôi quan tâm đến nguồn lúa OM18.',created:'2026-10-16'},
    {id:'O5',listingId:'L3',traderId:'T1',price:8200,maximumDeduction:2,status:'ACCEPTED',message:'Đã thống nhất trao đổi.',created:'2026-10-10'}
  ],
  people:{
    F1:{id:'F1',name:'Nguyễn Văn An',initial:'A',type:'farmer',location:'An Giang'},
    T1:{id:'T1',name:'Thương lái Minh',initial:'M',type:'trader',location:'An Giang'},
    T2:{id:'T2',name:'Thương lái Hòa',initial:'H',type:'trader',location:'Cần Thơ'},
    T3:{id:'T3',name:'Thương lái Phúc',initial:'P',type:'trader',location:'Đồng Tháp'}
  },
  conversations:[
    {id:'C1',offerId:'O2',farmerId:'F1',traderId:'T2',unreadFarmer:2,unreadTrader:0,last:'Vậy mình kiểm tra lại điều khoản nhé.',when:'09:24',status:'ACTIVE',messages:[
      {id:'M1',sender:'T2',body:'Chào cô chú, tôi muốn thu mua lúa ST25 của ruộng A1.',time:'09:18',type:'TEXT'},
      {id:'M2',sender:'F1',body:'Chào anh, mình trao đổi giá và ngày giao nhé.',time:'09:20',type:'TEXT'},
      {id:'M3',sender:'T2',body:'Vậy mình kiểm tra lại điều khoản nhé.',time:'09:24',type:'TEXT'}]},
    {id:'C2',offerId:'O5',farmerId:'F1',traderId:'T1',unreadFarmer:0,unreadTrader:1,last:'Mình đã xem thông tin hợp đồng.',when:'Hôm qua',status:'ACTIVE',messages:[
      {id:'M4',sender:'T1',body:'Chào cô chú, tôi quan tâm đến lúa Jasmine 85.',time:'14:02',type:'TEXT'},
      {id:'M5',sender:'F1',body:'Mình đã xem thông tin hợp đồng.',time:'14:10',type:'TEXT'}]}
  ],
  contracts:[
    {id:'CT1',offerId:'O2',traderId:'T2',farmerId:'F1',status:'CREATED',total:12900000,deposit:645000,date:'2026-11-03',terms:'Hai bên thống nhất thời gian và cách giao lúa theo thỏa thuận.',depositStatus:null,disputeId:null},
    {id:'CT2',offerId:'O5',traderId:'T1',farmerId:'F1',status:'ACTIVE',total:15990000,deposit:799500,date:'2026-10-28',terms:'Giao tại địa điểm hai bên đã thống nhất.',depositStatus:'LOCKED',disputeId:'D1'}
  ],
  disputes:[
    {id:'D1',contractId:'CT2',status:'UNDER_REVIEW',reason:'Tranh chấp về điều kiện giao nhận',applicant:'Nguyễn Văn An',submitted:'2026-10-16',detail:'Hai bên đang chờ Admin xem xét các bằng chứng và phản hồi.',hold:true},
    {id:'D2',contractId:'CT0',status:'OPEN',reason:'Chưa thống nhất chất lượng giao hàng',applicant:'Thương lái Hòa',submitted:'2026-10-17',detail:'Hồ sơ minh họa để kiểm tra bố cục, không có hợp đồng thực trong demo.',hold:true},
    {id:'D3',contractId:'CT-OLD',status:'RESOLVED',reason:'Đã xử lý theo quyết định Admin',applicant:'Nguyễn Văn An',submitted:'2026-10-08',detail:'Đã lưu lịch sử quyết định minh họa.',hold:false}
  ],
  notifications:[
    {id:'N1',title:'Có báo giá mới',text:'Một thương lái gửi báo giá cho lúa ST25 · Ruộng A1.',type:'OFFER_CREATED',read:false,time:'Hôm nay',target:'listing',targetId:'L1'},
    {id:'N2',title:'Tin nhắn mới',text:'Có tin nhắn trong cuộc trao đổi về lúa ST25.',type:'MESSAGE_CREATED',read:false,time:'Hôm nay',target:'messages',targetId:'C1'},
    {id:'N3',title:'Trạng thái hợp đồng thay đổi',text:'Hợp đồng CT2 hiện đang thực hiện.',type:'CONTRACT_STATUS_CHANGED',read:true,time:'16/10/2026',target:'contracts',targetId:'CT2'}
  ],
  accounts:[
    {id:'A1',name:'Nguyễn Văn An',role:'FARMER',status:'ACTIVE',email:'farmer.demo@example.com',joined:'09/2026'},
    {id:'A2',name:'Thương lái Minh',role:'TRADER',status:'ACTIVE',email:'trader.minh@example.com',joined:'09/2026'},
    {id:'A3',name:'Thương lái Hòa',role:'TRADER',status:'LOCKED',email:'trader.hoa@example.com',joined:'09/2026'},
    {id:'A4',name:'Nguyễn Văn Bình',role:'FARMER',status:'UNVERIFIED',email:'farmer.binh@example.com',joined:'10/2026'}
  ]
};
