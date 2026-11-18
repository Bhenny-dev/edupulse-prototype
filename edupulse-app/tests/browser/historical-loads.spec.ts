import{test}from'@playwright/test'
import{historicalLoadsScene}from'../historical-loads-ui'
for(const role of ['dean','associate_dean'])test(`${role} reads prior teaching degrees and inactive staff without changing current accounts`,async({page},info)=>{
 await historicalLoadsScene(page,role,async name=>{await page.screenshot({path:info.outputPath(name+'.png'),animations:'disabled'})})
})
