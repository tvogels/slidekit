# 0
Thank you all for coming. 
My plan for the next 30 minutes is to discuss __three papers__ on __gradient compression__ for training __neural networks__. 
If at any point something is unclear, feel free to __interupt__ me along the way. Would be __happy__ to clarify.


# 1
Okay, let's set some context. 
We are going to __train__ a machine learning model in parallel with __multiple workers__.
We are running something like __SGD__, and at each iteration the workers have the __same parameters__.
They will then gets different __data points__ to __process__,
and therefore also get their own __stochastic gradients__.

# 2
The next step is to __average__ the worker's gradients.

# 3
For this, workers need to communicate over a __network__.

# 4 
Now, the __problem__ is that these gradients are as big as the models. For a neural network, this can easily be 100's of MBs.
So this communication __takes time__ and becomes a __bottleneck__ in scaling distributed training.

# 5
Given this problem

# 6
One thing you __can do__ is to __compress gradients__ before sending them to other workers.
This is the __core idea__ of __all__ the papers we will look at today.


# 7
The first paper on the list is __Quantized SGD__ by Alistarh and colleagues. 
Some __core features__ of QSGD are:
(1) it is __unbiased__, so quantizing a gradient __repeatedly__ gives you the input back on average
(2) the paper also includes a specific __binary coding scheme__ to pack the compressed gradients __into bits__
(3) and its full of __mathematical analysis__. They have convergence rates, expected message sizes, and they analyze __trade-offs__ in choosing the __coarseness__ of the quantization.

# 8
The __second__ paper on the menu is __ATOMO__ by Wang and colleauges.
They __formulate__ a __broader class__ of compression schemes based on __sparsification__ in __arbitrary bases.__
And in __particular__, one scheme that they analyse uses __Singular Value Decomposition__ and sparsifies the __singular vectors__ instead of the individual coordinates.
So, for __any__ such decomposition, they __develop__ some math around __optimizing__ the compressor's variance.

# 9
The __last__ paper we will look at today, is a paper from __Praneeth__ from our group.
and they analyze an algorithm that allows even __biased__ compressors to converge.
This algorithm is __error feedback__.
In their __experiments__ they focus on adding this Error Feedback to a __sign-based compression scheme__.
And in __addition__ to these experiments, they also have __nice theory__ we will discuss.



# 10
Okay. Let's __dive__ into it.
__Before__ we look at __QSGD__, we should know a little bit of __historical context__.
Gradient compression __appeared__ in __practise__ before it came to academica.
People working on frameworks like __TensorFlow__ just decided to __drop__ the __floating point precision__ to 16 bits or lower.
And, it was only slightly __later__, that the __academic__ community found that much more __aggressive__ quantization could also work in practise
But, at that time, there were __no proofs__. 
I think QSGD was the __first paper__ with such a __theoretical analysis__.


# 11
To illustrate the __quantization__ in QSGD, I made a little __two-dimensional__ illustration.
We start here with a __gradient vector__.

# 12
And we basically __treat it__ like it has __unit length__.
When we are going to __send__ the __compressed__ gradient later, we will always include the __norm separately__ in full precision, so this should be okay.

# 13
Now, we can __choose__ how __coarse__ the quantization grid should be.
This __grid__ is always __relative__ to the __normalized vector__.

# 14
Now, if you just __snap__ each coordinate to the nearest grid point, you introduce __bias__ in the compressor.
But we can actually make the quantization __unbiased__ by using __stochastisity__.
This works like this:

# 15
If a coordinate falls __inbetween two grid points__, we just randomly choose any of them.
By chosing the __closer grid point__ more often, we can make the __means work out__ in expectation.
And that's the '__essence__ of the Q in QSGD.

# 16
This __unbiasedness__ is the __first__ important property of QSGD.
But, it's other notable features are 

# 17
__Bounded variance__, which you can probably imagine.
This depends on the grid spacing.
Finer grids will give you a smaller variance.

# 18
And __sparsity__, which is quite __interesting__ ...

# 18
Have a look at the __2d illusttration__ here on the left.
Look at how the __norm constraint__, the circle, __links__ the values of the coordinates.
If one of them is __small__, the other is automatically __large__. 
Now, in __higher dimensions__ than '2, this idea can be __extended__ to something like
'__a certain number of coordinates__ must fall in between the first __two grid cells__'. 
And even __more general__, small values are __more likely__ than large ones.
So, this means, relatively __many coordinates__ are set to __zero__. It's __sparse__!

# 19
The authors of QSGD make __effective use__ of this sparsity. 
They basically design a __dedicated coding scheme__ for these compressed vectors. 
It works like this:
Each package __starts__ with the __norm__ of the vector

# 20
Then there is a __tuple__ for each __non-zero coordinate__. 
It contains (1) their __'position'__ relative to the __last non non-zero__ coordinate
Then comes the coordinate's __sign__ and finally the __index__ of the quantization __bin__.

# 21
To __represent__ the integers by __bits__, they use an algorithm called __Elias__ coding, 
This coding basically assigns **shorter codes** to __lower numbers__, which is __good__ for the __statistics__ of our coordinates.

# 22
And such a tuple is __repeated__ for each non-zero coordinate.

# 23
From this coding, you can see that, __very sparse__ gradients are compressed __a lot__.
And if you want to achieve __achieve__ high sparsity, what you do is use a very __coarse grid__, like, __binary__, for example.
On the __other side__, though, if you __choose__ a very coarse grid, your compressor will have __higher variance__, so you need __more SGD steps__. 
So, you see ... there is an __inherent trade-off__ between the variance of compressed messages and their size. This trade-off is something the authors analyse.

# 24
The paper includes an __analysis__ for __two settings__ on this spectrum.
The first is __one extreme__, where a __binary__ grid is used.
If __d is the number of coordinates__ in the gradient, you actually need __less than 1 bit__ per coordinate.
But, on the __downside__, the __variance__ of the gradient can grow by a factor __sqrt d__, which means you may basically need __sqrt d more iterations__ to converge.

# 25
The __second settingis__ is one where the number of levels scales with __sqrt d__.
In this scenario, there __still__ is a __reasonably good__ compression,
but __also__ the variance will not incraese by more than 2 times over the stochastisticy in SGD.
So they can use __much few bits__ (compare to 32d), and at the same time __don't take__ much longer.

# 26
__Later__, I will say something about __experimental results__ of this paper, 
but for __now__, the __last thing__ I want to say about it is that QSGD is __guaranteed to converge__.
This __makes sense__, since it is __unbiased__ and has __bounded variance__. 
You can just see the compression as __additional noise__ on the stochastic gradients, and then __rely on__ standard theory.

# 27
Time to __switch gears__, now.
The __kind of sparsity__ we have seen in __QSGD__ was always __per coordinate__.
Now, if we __decompose__ the gradient vector onto a __unit basis__, 
this is just like __dropping basis vectors__ randomly.

# 28
The __second paper__ on the list today __extends__ this idea of decomposition by allowing __different__ sets of __atoms__ than just the unit basis.

# 29
Now, __if__ you want to __drop__ terms here, __without__ introducing bias, you can __correct__ for it by scaling the coefficients.

# 30
Basically, if you __include__ a vector every __3rd time__, you should __scale__ the coefficient by 3.
But the __question__ you may ask yourself is: 
__How__ do I chose these probabilities to make __best use__ of my sparsity budget? 

# 31
To answer that question, we should __define__ what this budget is.
Here, I __introduce__ a variable <strong>n</strong>, and it is the __sum__ of all the selection probabilities of the atoms. 
It is the __expected__ number of atoms that will be __selected__.

# 32
The Atomo paper has a __extensive section__ on answering this question of __dividing__ a fixed budget.

# 33
Again, you should probably aim to __minimize the variance__ of the compressor
And it __turns out__ you can do this by __including__ each term with a probability that is __proportional__ to the __absolute value__ of its coeffient.
So, the __larger__ the coeffient, the __more likely__ it is to be sampled.
I think this should be __natural__. It's just like __variance reduction__ for __Monte Carlo integration__.


# 34
Now, this __theory__ holds for __any basis__.

If you use the __unit-bases__, with a certain budget this is shown to be equivalent to __1-bit QSGD__.
But the __favourite basis__ of the authors is based on __SVD decomposition__.

# 35
Let's see how this works for a __convolutional layer__.
The __gradient__ for such a layer is __4-dimensional__.
There are dimensions for the number of input features, number of output features, and the kernel width and height.

# 36
To be able to compute an __SVD__, you __need a matrix__.
So, the authors __achieve__ this by __stacking up__ the kernels in pairs of two.
This sounds a bit __arbitrary__ to me, but this __probably__ ensures higher compression is achievable.

# 37
Now, the cool observation from the paper, is that the __spectrum__ of the singular values of such a matrix __decays quickly__.

# 38 
The first few components are much more important than the rest. 
This __promises good compression__.


# 39
So, let's see __when__ this __spectral__ decomposition is better than the __element-wise__ one.

There are some __subtleties__ here that we should __get straight__ before we __compare__ them. 
Mainly, sending __'one atom'__ does __not__ have same __cost__ for spectral and for element-wise.
For the __SVD__, you need to send __two vectors__ per atom. 
For the __normal decomposition__, just __1 integer__.

# 40 
So we compare them at __scaled budgets__

# 41
In this setting, the __SVD__ turns out to be __better if__

# 42
The scaled __sum__ of __absolute singular values__
*click* is __smaller__ than the __sum__ of the __raw absolute entries__ from the gradient.
This makes __sense__. 
It kind of __compares__ the __'peakiness'__ of the two representations.

# 44
That's __all__ I wanted to __tell you__ about Atomo. 
On to the __next topic__.
We are going to discuss __error feedback__ as a general algorithm 
to make even __bad compressors__ converge.

# 45
Let's __dive__ into the __error feedback__ algorithm now.
So, we __start__ with some __model state__ that I drew in this __parameter space__.

# 46
Then, we compute a __gradient__.
(What I draw here is the negative gradient scaled by the learning rate)
But we __cannot__ just __go__ there, but instead we __need to__

# 47
compress the update, and then __go__ to where __this points us__.

# 48
Here is the __key__: 
We don't just __give up__ now, but we will __memorize__ the __difference__ between where we __went__ and where we __wanted to go__. 

# 49
And then, just __try again next time__.

# 51
So __next time__ we compute a gradient, we __add back__ the memory
*click*

# 52
And now the __error__ actually became __smaller__.

# 53
Look, the memory now made us choose a __different__ bin.
So this is a __good example__ of how error feedback __eventually__ applies old updates.

# 54
Now we just __store__ the error again, and __repeat__.

# 55
Now, it's __important__ to note that the paper I picked is __not the first__ paper to __use__ Error Feedback. 
In fact, the algorithm was __already used__ in 2014 in this context.
But here, __results__ were __purely empirical__.

# 56
It was __also__ not the first to __analyse__ the the method. 
There was already some analysis in the __convex setting__ by __other people__ from our group. 

The reason chose __this particular__ paper out of these three is that is includes an __elegant proof technique__ that makes it __easy to reason__ about error feedback. 
It also formed the __inspiration__ for my current work, but I'll __get back__ to that at the end.


# 57
So I __briefly__ want to show you __the essense__ of the __convergence proofs__ in this paper.
The __only requirement__ placed on the compressor is __this here__:
It must have some kind of '__relative__' accuracy. 
__No matter__ the __scale__ of the gradients, the compressor should __intiutively__ get at least __some fraction__ right.

# 58
And here, the __parameter delta__ defines the __quality__ of the compressor, where basically 1 means it's perfect and 0 is terrible.

# 59

# 61
now, the errors we accumulate have an __upper bounded variance__, so they accumulate by __fixed amounts__
but we always '__resolve__' a __fraction__ of what we wanted to send. 
Using this intuition, you could imagine that __error we accumulate__ along the way __is bounded__.
This is the upper bound. It __depends__ on the learning rate and variance bound, so ...

# 62
With this knowledge, we can __already__ understand the __core__ of the proof for smooth functions.
Here, I drew an __SGD trajectory__ again. 
The __green__ arrows are __gradients__, 
__light red__ is the __previous__ memory, 
and __red__ is __current__ error.

# 63
I now __copied__ the same image to the __right__.
The __trick__ of the proof is to consider __another sequence__.
(Let me go __back and forth__ a bit.)

# 64
The sequence where we __subtract the errors__ actually __follows__ a trajectory that looks much __more like SGD__. 
It's __follows the gradients__ we computed. 
The only __issue__ is that these gradients were computed at the __wrong point__.

# 65

# 66
This wrong point is __off by the memory__, which we __know__ is __not too far__.
Now, if we assume __smoothness__, which is quite common, this means that the __gradient there__ also similar. 
This brings us back to regular SGD analysis again.


# 67
Now, something is __really cool__ here.
Remember that compressor quality parameter __delta__?
In the __smooth case__, this only appears in the rate in __small terms__. 
So it's asymptotically __as fast__ as SGD.


# 68
Okay, I've __done some marketing__ for three papers now. And I __do__ think they are __very interesting__. But I also __see some issues__ in them, especially on the __practical side__.
The __main one__ is that the __compressed__ gradients in any of these papers need to be __sent to all nodes__. It's an __all-to-all__ gather operation.
Normal SGD can do something __smarter__. 
What you can do for SGD is __hierarchically combine gradients__ from nodes to reduce on communication.

# 69
This is quite a __pitty__, since the __fastest__ distributed training experiments __all__ rely on __this kind__ of __hierarchical__ reduction.

# 70
I am also a little __sceptical__ about the __results__ mentioned in these papers.
I haven't mentioned them __much so far__, but I'll give you a __summary__.
QSGD runs on __one machine__ with 16 GPUs, and reports a __2x training time__ reduction over SGD.

# 71
__ATOMO__ uses __16 workers__ and a __parameter server__. 
They mention that their __spectral decomposition__ works __better__ than __QSGD__, 
but __all__ their results are __exceptionally slow__.
They are actually __so slow__ that the SVD computed at __each iteration__ does not seem to matter. 
That's __quite different__ from what I saw in my __own experiments.__

# 72
The __error feedback__ paper only includes __single worker__ simulations, 
but they __focus__ on the achieved __test accuracy__ compared to the __number of steps__.
It's a __shame__ there are no wall-clock times, but at least there is __less to complain__ about.

# 73
The __problem__ with the timings in these papers is that the results are __super sensitive__ to the particular setting. 
Think of, for example, network, communication library, how optimized the code is, or the GPU. 
This is __okay__, but the papers __don't include__ enough __details__ to learn about these __specifics__.

# 74
One clear __example__ is __Atomo__, which uses a __parameter server__, 
but does __not__ describe __how__ the averaged gradients are transferred __back__ to the workers. 

# 75
Also, I am __sceptical__ that the __baselines__ are __not__ tuned to their __best performance__.
In __QSGD__, for example, I __don't__ think they use __all-reduce__ for SGD, but the __same__ communication scheme they use for their method.

# 76
To __conclude__, I just want to __outline__ briefly what I am working on __now__ and how I plan to __continue__ with this in the __future__.
__Last semester__, we developed a __low-rank__ based __gradient compression method__ that solves some of the __problems__ I mentioned about the three papers discussed.

# 77
As I said, a __Singular Value__ decomposition is __really slow__. We can __avoid__ this by using an __approximate__ method based on __power iteration__.
The method can __achieve__ very __high compression__ and
as a bonus supports __all-reduce__ communication.
Finally, because the algorithm is based on __error feedback__, it does __not degrade__ test quality.

# 78
To __continue__ this line of work, I think it could be __interesting__ to extend the low-rank idea to compression of __models__ instead of __gradients__.
There has __already__ been work that does something like __error feedback__ for __quantization__ of models during training.
We also __notice__ something __interesting__. We see that gradient compression can actually __improve__ test accuracy rather than __decrease__. 
There are __lots of questions__ to be answered in this area, and we hope to __tackle some__.

# 79
Alright. That was it from my side. 
We have looked at __three papers__ that aim to __speed up__ distributed training of neural networks.
They do this by __compressing__ the gradients to __reduce__ the __time spent__ communicating.
We had __QSGD__, an __unbiased__ quantization method.
__Atomo__, a __framework__ of sparsification methods that aim at __minimal variance__
and __error feedback__, an algorithm which allows even __biased compressors__ to converge.
I would be __happy__ to answer any questions you may have now :)
