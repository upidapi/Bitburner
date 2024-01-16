you run the script by running "thread/Controller.js"


is has auto everything so you (almost) shouldn't have to do anything 


to run this you need the following folders / files:
    thread/
        (all files and folders in the "thread") folder

    Other/ScanServers.js
    Other/PurchaseServers



This a a autonomous hybrid batcher 
    it consists of the following:

        an auto targeter / batch calculator
            finds the optimal target
            calculates the optimal batch for said target an ram

        a jit batcher
            very effective (ram) but instable and a bit slow

        a continuous shotgun batcher
            very fast, stable but ram ineffective

        a server upgrader
            upgrades and purchase personal servers   

        a controller
            well it controls everything


    what it can't do:

        things that require singularity
            for example buying / creating the port openers


if you want to you could add:
    batch size based on the predicted level when the batch completes

    calculations for hack %

    add a targeter that doesn't only care about the money per second
        Batching at a "worse" target might improve your situation by giving 
        you money sooner. 
        
        That might in turn result in faster scaling. since you might be able 
        to upgrade your servers faster, get programs faster. Which in turn
        makes everything go faster 
        
        And it might take a (very) long time to prep a server and you might 
        not what to use that server for a very long time so the total money
        per sec over the servers "use time" is worse than other options 
        